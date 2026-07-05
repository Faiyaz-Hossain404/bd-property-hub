import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model, Types } from 'mongoose';
import type {
  CommitListingMediaInput,
  CreateListingInput,
  ListingMediaUploadTicket,
  ListingPublicationStatus,
  PublicListing,
  PublicListingLocation,
  PublicListingMedia,
  PublicListingQuery,
  PublicListingStatusHistoryEntry,
  UpdateListingInput,
} from '@bdph/types';
import {
  LISTING_IMAGE_FORMATS,
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_PHOTOS,
  listingCompletenessGaps,
} from '@bdph/types';
import { escapeRegExp } from './listing-search.util';
import { Listing, ListingDocument, ListingLocation, ListingMedia } from './schemas/listing.schema';
import { ListingStatusHistory, ListingStatusHistoryDocument } from './schemas/listing-status-history.schema';
import { GeoService, type ListingLocationSnapshot } from '../geo/geo.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const RESUBMITTABLE_STATUSES: ListingPublicationStatus[] = ['draft', 'rejected'];

// Hard ceiling for the price-sort offset cursor (≈500 pages at the max page size).
// A real deep-paging need predates the keyset upgrade; until then this caps the
// rows Mongo will skip for any single request.
const MAX_CATALOG_OFFSET = 10_000;

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(ListingStatusHistory.name)
    private readonly statusHistoryModel: Model<ListingStatusHistoryDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly geo: GeoService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createDraft(ownerId: string, input: CreateListingInput): Promise<ListingDocument> {
    const location = input.location
      ? this.toLocationSubdoc(await this.geo.resolveListingLocation(input.location.districtId))
      : null;
    return this.listingModel.create({
      ownerId: new Types.ObjectId(ownerId),
      titleEn: input.titleEn,
      titleBn: input.titleBn ?? null,
      descriptionEn: input.descriptionEn ?? null,
      descriptionBn: input.descriptionBn ?? null,
      assetType: input.assetType,
      transactionType: input.transactionType,
      isGroupPurchase: input.transactionType === 'shared_ownership',
      attributes: input.attributes ?? {},
      pricing: input.pricing ?? {},
      location,
    });
  }

  findOwnByOwner(ownerId: string): Promise<ListingDocument[]> {
    return this.listingModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  findPendingQueue(): Promise<ListingDocument[]> {
    return this.listingModel.find({ publicationStatus: 'pending_review' }).sort({ createdAt: 1 }).exec();
  }

  findById(listingId: string): Promise<ListingDocument> {
    return this.findOrThrow(listingId);
  }

  async findStatusHistory(listingId: string): Promise<PublicListingStatusHistoryEntry[]> {
    // Same malformed-id guard as findOrThrow. The controller already calls the
    // guarded findById() before this, so a bad id is a clean 404 in practice —
    // this keeps that true if this method is ever called on its own.
    if (!Types.ObjectId.isValid(listingId)) {
      throw new NotFoundException('Listing not found');
    }
    const entries = await this.statusHistoryModel
      .find({ listingId: new Types.ObjectId(listingId) })
      .sort({ createdAt: 1 })
      .exec();
    return entries.map((entry) => this.statusHistoryToPublic(entry));
  }

  // Public catalog browse (LIFE-1): only `approved` listings whose availability
  // is `available` or `pending` are discoverable; `sold`/`rented` drop out of the
  // feed (but stay reachable by direct link — see findPublicListing). We over-fetch
  // one row to know whether a next page exists. Facets (FR-B1): district (DISC-3),
  // asset and transaction type, and an inclusive BDT price range narrow the query.
  // A price bound filters on `pricing.amountBdt`, so price-optional listings (no
  // amount) drop out whenever either bound is set — intended.
  //
  // Sort (DISC-2): `newest` keeps the keyset cursor over (createdAt desc, _id desc).
  // The price sorts use OFFSET pagination instead, because a keyset over a nullable
  // numeric field is unsafe — MongoDB range operators are type-bracketed, so a
  // numeric keyset bound never matches null-priced rows and would strand the
  // "price on request" listings after page one. Offset re-runs a stable sort each
  // page, so nulls stay put (Mongo orders null lowest: they land first under
  // price_asc, last under price_desc). The cursor is opaque either way, so this
  // split is invisible to clients and can move to keyset later. Index tuning for
  // facets/price belongs to the Phase-2 search/caching item.
  async findPublicPage(
    query: PublicListingQuery,
  ): Promise<{ items: ListingDocument[]; nextCursor: string | null }> {
    const { limit, cursor, sort, district_id, asset_type, transaction_type, price_min, price_max, q } =
      query;
    const filter: FilterQuery<ListingDocument> = {
      publicationStatus: 'approved',
      availabilityStatus: { $in: ['available', 'pending'] },
    };
    // district_id is Zod-validated to 24-hex at the boundary, so casting is safe;
    // the equality narrows the query to a single Zilla (DISC-3).
    if (district_id) {
      filter['location.districtId'] = new Types.ObjectId(district_id);
    }
    if (asset_type) {
      filter.assetType = asset_type;
    }
    if (transaction_type) {
      filter.transactionType = transaction_type;
    }
    if (price_min != null || price_max != null) {
      const range: { $gte?: number; $lte?: number } = {};
      if (price_min != null) range.$gte = price_min;
      if (price_max != null) range.$lte = price_max;
      filter['pricing.amountBdt'] = range;
    }
    // Free-text title search (DISC-8). The query text is escaped to a literal
    // pattern so regex metacharacters from user input match verbatim — no
    // injection / ReDoS via attacker-controlled syntax. Matches either language's
    // title, case-insensitively. This is a collection scan (no text index yet);
    // fine at the current catalog size — a text index / Atlas Search is the
    // Phase-2 search/caching optimization. Built under $and so it composes with
    // the keyset $or the `newest` cursor sets below (two top-level $or keys would
    // otherwise clobber each other).
    if (q) {
      const pattern = new RegExp(escapeRegExp(q), 'i');
      filter.$and = [{ $or: [{ titleEn: pattern }, { titleBn: pattern }] }];
    }

    if (sort === 'price_asc' || sort === 'price_desc') {
      const dir = sort === 'price_asc' ? 1 : -1;
      const offset = cursor ? this.decodeOffsetCursor(cursor) : 0;
      const docs = await this.listingModel
        .find(filter)
        .sort({ 'pricing.amountBdt': dir, _id: dir })
        .skip(offset)
        .limit(limit + 1)
        .exec();
      const hasMore = docs.length > limit;
      const items = hasMore ? docs.slice(0, limit) : docs;
      const nextCursor = hasMore ? this.encodeOffsetCursor(offset + limit) : null;
      return { items, nextCursor };
    }

    // sort === 'newest' — keyset cursor over (createdAt desc, _id desc).
    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      // Keyset: rows strictly "after" the cursor; the $or is ANDed with the facet
      // predicates above (a top-level field, so they compose safely).
      filter.$or = [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }];
    }

    const docs = await this.listingModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    // When hasMore is true `items` is non-empty (limit >= 1), so `last` is
    // always defined; the guard also satisfies noUncheckedIndexedAccess
    // without resorting to a non-null assertion.
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? this.encodeCursor(last) : null;
    return { items, nextCursor };
  }

  // Public listing detail. Only `approved` listings are publicly viewable (any
  // availability — an approved-then-sold listing stays reachable by permalink).
  // draft/pending_review/rejected/archived all return an indistinguishable 404
  // so non-public listings can't be probed/enumerated. A malformed id is 404,
  // not a 500, since this is an unauthenticated, internet-facing route.
  async findPublicListing(listingId: string): Promise<ListingDocument> {
    if (!Types.ObjectId.isValid(listingId)) {
      throw new NotFoundException('Listing not found');
    }
    const listing = await this.listingModel
      .findOne({ _id: listingId, publicationStatus: 'approved' })
      .exec();
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  // Approved (publicly viewable) listings for a set of ids — used by saved
  // listings (favorites) to hydrate a buyer's bookmarks. Mirrors findPublicListing's
  // visibility rule: only `approved` listings are returned, and malformed ids are
  // dropped rather than throwing, so a stale/removed favorite just doesn't appear.
  // Order is not guaranteed here; the caller re-orders by their own criteria.
  async findPublicByIds(listingIds: string[]): Promise<ListingDocument[]> {
    const validIds = listingIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) return [];
    return this.listingModel
      .find({ _id: { $in: validIds }, publicationStatus: 'approved' })
      .exec();
  }

  // Seller editing their own draft/rejected listing's content (fields filled
  // in after createDraft, or corrections after a MOD-1 rejection) before
  // (re)submitting. Not allowed once pending_review/approved/archived — the
  // owner must wait for a decision (or use the resubmit loop) first.
  // `attributes`/`pricing` are merged field-by-field: an omitted sub-field
  // keeps its prior value, and `attributes: {}`/`pricing: {}` is a no-op —
  // there is no "clear this field" sentinel yet.
  async update(ownerId: string, listingId: string, input: UpdateListingInput): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    if (!RESUBMITTABLE_STATUSES.includes(listing.publicationStatus)) {
      throw new ConflictException(`Cannot edit a listing in status "${listing.publicationStatus}"`);
    }

    if (input.titleEn !== undefined) listing.titleEn = input.titleEn;
    if (input.titleBn !== undefined) listing.titleBn = input.titleBn;
    if (input.descriptionEn !== undefined) listing.descriptionEn = input.descriptionEn;
    if (input.descriptionBn !== undefined) listing.descriptionBn = input.descriptionBn;
    if (input.assetType !== undefined) listing.assetType = input.assetType;
    if (input.transactionType !== undefined) {
      listing.transactionType = input.transactionType;
      listing.isGroupPurchase = input.transactionType === 'shared_ownership';
    }

    const attrs = input.attributes;
    if (attrs !== undefined) {
      if (attrs.facing !== undefined) listing.attributes.facing = attrs.facing;
      if (attrs.roadSizeFt !== undefined) listing.attributes.roadSizeFt = attrs.roadSizeFt;
      if (attrs.rooms !== undefined) listing.attributes.rooms = attrs.rooms;
      if (attrs.baranda !== undefined) listing.attributes.baranda = attrs.baranda;
      if (attrs.washrooms !== undefined) listing.attributes.washrooms = attrs.washrooms;
      if (attrs.areaSqft !== undefined) listing.attributes.areaSqft = attrs.areaSqft;
      if (attrs.landSizeValue !== undefined) listing.attributes.landSizeValue = attrs.landSizeValue;
      if (attrs.landSizeUnit !== undefined) listing.attributes.landSizeUnit = attrs.landSizeUnit;
    }

    const pricing = input.pricing;
    if (pricing !== undefined) {
      if (pricing.amountBdt !== undefined) listing.pricing.amountBdt = pricing.amountBdt;
      if (pricing.priceType !== undefined) listing.pricing.priceType = pricing.priceType;
      if (pricing.rentPeriod !== undefined) listing.pricing.rentPeriod = pricing.rentPeriod;
    }

    // Location is a single selector, so it is replaced wholesale (not merged
    // field-by-field like attributes/pricing) when the seller sends a new one.
    if (input.location !== undefined) {
      listing.location = this.toLocationSubdoc(
        await this.geo.resolveListingLocation(input.location.districtId),
      );
    }

    await listing.save();
    return listing;
  }

  // Seller withdrawing their own listing (LIFE-4) — hides it from search while
  // retaining the record. Reversible via restore() below.
  async withdraw(ownerId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    if (listing.publicationStatus === 'archived') {
      throw new ConflictException('Listing is already archived');
    }
    return this.transitionStatus(listing, 'archived', ownerId, null);
  }

  // Seller restoring their own archived listing (LIFE-4). It returns to `draft`
  // (not straight back to `approved`) so it re-enters the normal submit →
  // moderate flow — restoring must never republish content to the public catalog
  // without a fresh review. Only an archived listing can be restored; anything
  // else is a no-op the caller shouldn't have offered, so it 409s.
  async restore(ownerId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    if (listing.publicationStatus !== 'archived') {
      throw new ConflictException('Only an archived listing can be restored');
    }
    return this.transitionStatus(listing, 'draft', ownerId, null);
  }

  // Seller submitting their own draft/rejected listing for moderation (FR-S8).
  // A submission must be complete enough to be worth a moderator's time and to
  // render meaningfully in the public catalog once approved — currently just an
  // area-level location (price is optional; see listingCompletenessGaps). This is
  // the authoritative gate; the dashboard also disables Submit proactively, but
  // the check here still holds if that UI is bypassed.
  async submitForReview(ownerId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    if (!RESUBMITTABLE_STATUSES.includes(listing.publicationStatus)) {
      throw new ConflictException(`Cannot submit a listing in status "${listing.publicationStatus}"`);
    }
    const gaps = listingCompletenessGaps(listing);
    if (gaps.length > 0) {
      throw new BadRequestException(`Add the listing's ${gaps.join(' and ')} before submitting for review`);
    }
    return this.transitionStatus(listing, 'pending_review', ownerId, null);
  }

  // Admin/super-admin approving a pending submission (FR-A6).
  async approve(actorId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOrThrow(listingId);
    if (listing.publicationStatus !== 'pending_review') {
      throw new ConflictException(`Cannot approve a listing in status "${listing.publicationStatus}"`);
    }
    return this.transitionStatus(listing, 'approved', actorId, null);
  }

  // Admin/super-admin rejecting a pending submission, with a reason the seller
  // sees before resubmitting (MOD-1 — no separate "changes requested" state).
  async reject(actorId: string, listingId: string, reason: string): Promise<ListingDocument> {
    const listing = await this.findOrThrow(listingId);
    if (listing.publicationStatus !== 'pending_review') {
      throw new ConflictException(`Cannot reject a listing in status "${listing.publicationStatus}"`);
    }
    return this.transitionStatus(listing, 'rejected', actorId, reason);
  }

  toPublic(listing: ListingDocument): PublicListing {
    const createdAt = listing.get('createdAt') as Date | undefined;
    const updatedAt = listing.get('updatedAt') as Date | undefined;
    return {
      id: listing._id.toString(),
      ownerId: listing.ownerId.toString(),
      titleEn: listing.titleEn,
      titleBn: listing.titleBn,
      descriptionEn: listing.descriptionEn,
      descriptionBn: listing.descriptionBn,
      originalLanguage: listing.originalLanguage,
      assetType: listing.assetType,
      transactionType: listing.transactionType,
      isGroupPurchase: listing.isGroupPurchase,
      publicationStatus: listing.publicationStatus,
      availabilityStatus: listing.availabilityStatus,
      attributes: {
        facing: listing.attributes.facing ?? undefined,
        roadSizeFt: listing.attributes.roadSizeFt ?? undefined,
        rooms: listing.attributes.rooms ?? undefined,
        baranda: listing.attributes.baranda ?? undefined,
        washrooms: listing.attributes.washrooms ?? undefined,
        areaSqft: listing.attributes.areaSqft ?? undefined,
        landSizeValue: listing.attributes.landSizeValue ?? undefined,
        landSizeUnit: listing.attributes.landSizeUnit ?? undefined,
      },
      pricing: {
        amountBdt: listing.pricing.amountBdt ?? undefined,
        priceType: listing.pricing.priceType ?? undefined,
        rentPeriod: listing.pricing.rentPeriod ?? undefined,
      },
      location: listing.location ? this.locationToPublic(listing.location) : null,
      media: this.mediaToPublic(listing.media),
      createdAt: (createdAt ?? new Date()).toISOString(),
      updatedAt: (updatedAt ?? new Date()).toISOString(),
    };
  }

  // Maps a resolved snapshot (string ids) into the stored subdoc shape (ObjectId
  // ids). Shared by createDraft and update so location persists identically.
  private toLocationSubdoc(snapshot: ListingLocationSnapshot): ListingLocation {
    return {
      divisionId: new Types.ObjectId(snapshot.divisionId),
      divisionCode: snapshot.divisionCode,
      divisionNameEn: snapshot.divisionNameEn,
      divisionNameBn: snapshot.divisionNameBn,
      districtId: new Types.ObjectId(snapshot.districtId),
      districtCode: snapshot.districtCode,
      districtNameEn: snapshot.districtNameEn,
      districtNameBn: snapshot.districtNameBn,
    };
  }

  private locationToPublic(location: ListingLocation): PublicListingLocation {
    return {
      divisionId: location.divisionId.toString(),
      divisionCode: location.divisionCode,
      divisionNameEn: location.divisionNameEn,
      divisionNameBn: location.divisionNameBn,
      districtId: location.districtId.toString(),
      districtCode: location.districtCode,
      districtNameEn: location.districtNameEn,
      districtNameBn: location.districtNameBn,
    };
  }

  // Mint a Cloudinary upload signature so a seller can upload one photo directly
  // to storage (FILE_STORAGE_ARCHITECTURE.md presign step). Owner-only, and only
  // while the listing is still editable. The asset is scoped to this listing's
  // folder so it cannot later be attached to a different listing.
  async createUploadSignature(ownerId: string, listingId: string): Promise<ListingMediaUploadTicket> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    this.assertEditable(listing);
    const folder = `listings/${listing._id.toString()}`;
    return this.cloudinary.createUploadSignature(folder);
  }

  // Record a photo the seller uploaded to Cloudinary (FILE_STORAGE commit step).
  // Security: the server re-verifies Cloudinary's response signature (a forged
  // body fails), confirms the asset lives in THIS listing's folder (so it cannot
  // be borrowed from another listing/account), and enforces the image
  // format/size/count caps against the real asset metadata before recording it.
  async commitUploadedMedia(
    ownerId: string,
    listingId: string,
    input: CommitListingMediaInput,
  ): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    this.assertEditable(listing);

    const verified = this.cloudinary.verifyUpload({
      publicId: input.publicId,
      version: input.version,
      signature: input.signature,
      resourceType: input.resourceType,
      format: input.format,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
    });

    const folderPrefix = `listings/${listing._id.toString()}/`;
    if (!verified.publicId.startsWith(folderPrefix)) {
      throw new BadRequestException('Upload does not belong to this listing');
    }
    if (!(LISTING_IMAGE_FORMATS as readonly string[]).includes(verified.format.toLowerCase())) {
      throw new BadRequestException('Unsupported image format');
    }
    if (verified.bytes > MAX_LISTING_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds the maximum allowed size');
    }

    const newMedia: ListingMedia = {
      kind: 'photo',
      status: 'ready',
      storageKey: verified.publicId,
      url: verified.url,
      format: verified.format,
      bytes: verified.bytes,
      width: verified.width,
      height: verified.height,
      position: listing.media.length,
    };
    // Atomic write: append only if this exact asset is not already attached
    // (rejects a replayed commit) AND the photo count is still under the cap.
    // Doing both in one findOneAndUpdate — rather than read-check-push — closes
    // the race between concurrent commits on the same listing.
    const underPhotoCap = {
      $lt: [
        {
          $size: {
            $filter: {
              input: { $ifNull: ['$media', []] },
              cond: { $eq: ['$$this.kind', 'photo'] },
            },
          },
        },
        MAX_LISTING_PHOTOS,
      ],
    };
    const updated = await this.listingModel.findOneAndUpdate(
      { _id: listing._id, 'media.storageKey': { $ne: verified.publicId }, $expr: underPhotoCap },
      { $push: { media: newMedia } },
      { new: true },
    );
    if (!updated) {
      throw new ConflictException(
        `This photo is already attached, or the listing already has the maximum ${MAX_LISTING_PHOTOS} photos`,
      );
    }
    return updated;
  }

  // Remove one photo from a listing. Owner-only and only while the listing is
  // still editable (same gate as upload). The photo is addressed by its embedded
  // subdocument id (PublicListingMedia.id). After removal the remaining photos are
  // renumbered 0..n-1 so positions stay contiguous and the cover (position 0) is
  // always well-defined. The Cloudinary binary is intentionally left in place —
  // there is no storage-delete path yet, so the orphaned asset (in this listing's
  // private folder) is cleaned up by a later housekeeping step.
  async removeMedia(ownerId: string, listingId: string, mediaId: string): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    this.assertEditable(listing);

    const index = listing.media.findIndex((item) => this.mediaSubdocId(item) === mediaId);
    if (index === -1) {
      throw new NotFoundException('Photo not found');
    }

    listing.media.splice(index, 1);
    listing.media.forEach((item, position) => {
      item.position = position;
    });
    listing.markModified('media');
    await listing.save();
    return listing;
  }

  // Reorder a listing's photos. Owner-only and editable-only, like the other media
  // operations. `order` must be a permutation of the listing's current photo ids —
  // every existing photo listed exactly once — which rules out a stale client that
  // would otherwise drop or duplicate photos. order[0] becomes the cover (position
  // 0). Today every media item is a `ready` photo, so the client's visible list
  // matches the stored set; if non-photo/pending media is ever added, this rule
  // will need to account for items the client can't see.
  async reorderMedia(
    ownerId: string,
    listingId: string,
    order: string[],
  ): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    this.assertEditable(listing);

    const currentIds = listing.media.map((item) => this.mediaSubdocId(item));
    const isPermutation =
      order.length === currentIds.length &&
      new Set(order).size === order.length &&
      order.every((id) => currentIds.includes(id));
    if (!isPermutation) {
      throw new BadRequestException('Order must list each existing photo exactly once');
    }

    const byId = new Map(listing.media.map((item) => [this.mediaSubdocId(item), item]));
    const reordered = order.map((id, position) => {
      const item = byId.get(id)!;
      item.position = position;
      return item;
    });
    listing.set('media', reordered);
    await listing.save();
    return listing;
  }

  // The embedded media item's own _id as a string. Mongoose adds an `_id` to every
  // array subdocument; the cast surfaces it for the plain-typed media array.
  private mediaSubdocId(media: ListingMedia): string {
    return (media as ListingMedia & { _id: Types.ObjectId })._id.toString();
  }

  // Public projection of the media array: only `ready` items, ordered by position.
  // `url` is the server-built delivery URL. Storage internals and any sensitive
  // document data never appear here (A5). The `_id` cast is safe — Mongoose adds
  // an `_id` to every embedded array subdocument.
  private mediaToPublic(media: ListingMedia[]): PublicListingMedia[] {
    return [...media]
      .filter((item) => item.status === 'ready')
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        const stored = item as ListingMedia & { _id: Types.ObjectId };
        return {
          id: stored._id.toString(),
          kind: item.kind,
          url: item.url,
          width: item.width,
          height: item.height,
          position: item.position,
        };
      });
  }

  private assertEditable(listing: ListingDocument): void {
    if (!RESUBMITTABLE_STATUSES.includes(listing.publicationStatus)) {
      throw new ConflictException(`Cannot edit a listing in status "${listing.publicationStatus}"`);
    }
  }

  private async findOrThrow(listingId: string): Promise<ListingDocument> {
    // A malformed id is treated as "not found" rather than letting Mongoose
    // throw a CastError (which surfaces as a 500). Every owner/staff path routes
    // through here (update, withdraw, restore, submit, media, moderation,
    // status-history), so this one guard keeps them all returning a clean 404.
    if (!Types.ObjectId.isValid(listingId)) {
      throw new NotFoundException('Listing not found');
    }
    const listing = await this.listingModel.findById(listingId).exec();
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  private async findOwnedOrThrow(ownerId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOrThrow(listingId);
    if (listing.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You do not own this listing');
    }
    return listing;
  }

  // Opaque keyset cursor = base64url({ c: createdAt ISO, i: _id }). Opaque so
  // clients treat it as a token, not an offset they can hand-craft to deep-page.
  private encodeCursor(listing: ListingDocument): string {
    const createdAt = (listing.get('createdAt') as Date).toISOString();
    const json = JSON.stringify({ c: createdAt, i: listing._id.toString() });
    return Buffer.from(json, 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
    const record = parsed as { c?: unknown; i?: unknown };
    const createdAt = typeof record.c === 'string' ? new Date(record.c) : new Date(NaN);
    if (
      Number.isNaN(createdAt.getTime()) ||
      typeof record.i !== 'string' ||
      !Types.ObjectId.isValid(record.i)
    ) {
      throw new BadRequestException('Invalid cursor');
    }
    return { createdAt, id: new Types.ObjectId(record.i) };
  }

  // Opaque offset cursor = base64url({ o: rowsAlreadyReturned }), used by the
  // price sorts. Capped so a hand-crafted cursor can't ask Mongo to skip an
  // unbounded number of rows (deep-paging DoS); the catalog moves to keyset before
  // it ever needs to page that deep.
  private encodeOffsetCursor(offset: number): string {
    return Buffer.from(JSON.stringify({ o: offset }), 'utf8').toString('base64url');
  }

  private decodeOffsetCursor(cursor: string): number {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
    const record = parsed as { o?: unknown };
    if (
      typeof record.o !== 'number' ||
      !Number.isInteger(record.o) ||
      record.o < 0 ||
      record.o > MAX_CATALOG_OFFSET
    ) {
      throw new BadRequestException('Invalid cursor');
    }
    return record.o;
  }

  // Updates `listings.publicationStatus` and appends a `listingStatusHistory`
  // row in one transaction, per DATABASE_DESIGN.md §9.
  private async transitionStatus(
    listing: ListingDocument,
    toStatus: ListingPublicationStatus,
    actorId: string,
    reason: string | null,
  ): Promise<ListingDocument> {
    const fromStatus = listing.publicationStatus;
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        listing.publicationStatus = toStatus;
        await listing.save({ session });
        await this.statusHistoryModel.create(
          [
            {
              listingId: listing._id,
              fromStatus,
              toStatus,
              actorId: new Types.ObjectId(actorId),
              reason,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return listing;
  }

  private statusHistoryToPublic(entry: ListingStatusHistoryDocument): PublicListingStatusHistoryEntry {
    const createdAt = entry.get('createdAt') as Date | undefined;
    return {
      id: entry._id.toString(),
      listingId: entry.listingId.toString(),
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorId: entry.actorId.toString(),
      reason: entry.reason,
      createdAt: (createdAt ?? new Date()).toISOString(),
    };
  }
}
