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
  CreateListingInput,
  ListingPublicationStatus,
  PublicListing,
  PublicListingLocation,
  PublicListingStatusHistoryEntry,
  UpdateListingInput,
} from '@bdph/types';
import { Listing, ListingDocument, ListingLocation } from './schemas/listing.schema';
import { ListingStatusHistory, ListingStatusHistoryDocument } from './schemas/listing-status-history.schema';
import { GeoService, type ListingLocationSnapshot } from '../geo/geo.service';

const RESUBMITTABLE_STATUSES: ListingPublicationStatus[] = ['draft', 'rejected'];

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(ListingStatusHistory.name)
    private readonly statusHistoryModel: Model<ListingStatusHistoryDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly geo: GeoService,
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
    const entries = await this.statusHistoryModel
      .find({ listingId: new Types.ObjectId(listingId) })
      .sort({ createdAt: 1 })
      .exec();
    return entries.map((entry) => this.statusHistoryToPublic(entry));
  }

  // Public catalog browse (LIFE-1): only `approved` listings whose availability
  // is `available` or `pending` are discoverable; `sold`/`rented` drop out of
  // the feed (but stay reachable by direct link — see findPublicListing).
  // Cursor pagination over (createdAt desc, _id desc); we over-fetch one row to
  // know whether a next page exists. Filters/sort (DISC-2/DISC-3) come later.
  async findPublicPage(
    limit: number,
    cursor: string | null,
  ): Promise<{ items: ListingDocument[]; nextCursor: string | null }> {
    const filter: FilterQuery<ListingDocument> = {
      publicationStatus: 'approved',
      availabilityStatus: { $in: ['available', 'pending'] },
    };
    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      // Keyset: rows strictly "after" the cursor in (createdAt desc, _id desc).
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
  // retaining the record. One-way transition for now; restore is a separate,
  // not-yet-built increment (LIFE-4 also re-enters moderation on restore if
  // content changed, which needs its own design).
  async withdraw(ownerId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    if (listing.publicationStatus === 'archived') {
      throw new ConflictException('Listing is already archived');
    }
    return this.transitionStatus(listing, 'archived', ownerId, null);
  }

  // Seller submitting their own draft/rejected listing for moderation (FR-S8).
  async submitForReview(ownerId: string, listingId: string): Promise<ListingDocument> {
    const listing = await this.findOwnedOrThrow(ownerId, listingId);
    if (!RESUBMITTABLE_STATUSES.includes(listing.publicationStatus)) {
      throw new ConflictException(`Cannot submit a listing in status "${listing.publicationStatus}"`);
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

  private async findOrThrow(listingId: string): Promise<ListingDocument> {
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
