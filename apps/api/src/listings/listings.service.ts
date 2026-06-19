import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { CreateListingInput, PublicListing } from '@bdph/types';
import { Listing, ListingDocument } from './schemas/listing.schema';

@Injectable()
export class ListingsService {
  constructor(@InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>) {}

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
}
