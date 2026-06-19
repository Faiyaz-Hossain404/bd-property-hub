import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import type {
  CreateListingInput,
  ListingPublicationStatus,
  PublicListing,
  PublicListingStatusHistoryEntry,
} from '@bdph/types';
import { Listing, ListingDocument } from './schemas/listing.schema';
import { ListingStatusHistory, ListingStatusHistoryDocument } from './schemas/listing-status-history.schema';

const RESUBMITTABLE_STATUSES: ListingPublicationStatus[] = ['draft', 'rejected'];

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
    @InjectModel(ListingStatusHistory.name)
    private readonly statusHistoryModel: Model<ListingStatusHistoryDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  createDraft(ownerId: string, input: CreateListingInput): Promise<ListingDocument> {
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
      createdAt: (createdAt ?? new Date()).toISOString(),
      updatedAt: (updatedAt ?? new Date()).toISOString(),
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
