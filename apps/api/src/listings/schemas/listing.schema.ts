import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ASSET_TYPES,
  FACINGS,
  LAND_SIZE_UNITS,
  LISTING_AVAILABILITY_STATUSES,
  LISTING_PUBLICATION_STATUSES,
  PRICE_TYPES,
  RENT_PERIODS,
  SUPPORTED_LOCALES,
  TRANSACTION_TYPES,
  type AssetType,
  type Facing,
  type LandSizeUnit,
  type ListingAvailabilityStatus,
  type ListingPublicationStatus,
  type Locale,
  type PriceType,
  type RentPeriod,
  type TransactionType,
} from '@bdph/types';

export type ListingDocument = HydratedDocument<Listing>;

@Schema({ _id: false })
export class ListingAttributes {
  @Prop({ type: String, enum: FACINGS, default: null })
  facing!: Facing | null;

  @Prop({ type: Number, default: null })
  roadSizeFt!: number | null;

  @Prop({ type: Number, default: null })
  rooms!: number | null;

  @Prop({ type: Number, default: null })
  baranda!: number | null;

  @Prop({ type: Number, default: null })
  washrooms!: number | null;

  @Prop({ type: Number, default: null })
  areaSqft!: number | null;

  @Prop({ type: Number, default: null })
  landSizeValue!: number | null;

  @Prop({ type: String, enum: LAND_SIZE_UNITS, default: null })
  landSizeUnit!: LandSizeUnit | null;
}
export const ListingAttributesSchema = SchemaFactory.createForClass(ListingAttributes);

@Schema({ _id: false })
export class ListingPricing {
  @Prop({ type: Number, default: null })
  amountBdt!: number | null;

  @Prop({ type: String, enum: PRICE_TYPES, default: null })
  priceType!: PriceType | null;

  @Prop({ type: String, enum: RENT_PERIODS, default: null })
  rentPeriod!: RentPeriod | null;
}
export const ListingPricingSchema = SchemaFactory.createForClass(ListingPricing);

// The seller-facing draft slice of the listings aggregate (DATABASE_DESIGN.md
// §5). Geo, media, and installment terms are populated by later endpoints and
// are intentionally not modeled here yet.
@Schema({ collection: 'listings', timestamps: true })
export class Listing {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  titleEn!: string;

  @Prop({ type: String, default: null, trim: true })
  titleBn!: string | null;

  @Prop({ type: String, default: null })
  descriptionEn!: string | null;

  @Prop({ type: String, default: null })
  descriptionBn!: string | null;

  @Prop({ type: String, enum: SUPPORTED_LOCALES, default: 'en' })
  originalLanguage!: Locale;

  @Prop({ type: String, enum: ASSET_TYPES, required: true })
  assetType!: AssetType;

  @Prop({ type: String, enum: TRANSACTION_TYPES, required: true })
  transactionType!: TransactionType;

  @Prop({ default: false })
  isGroupPurchase!: boolean;

  @Prop({ type: String, enum: LISTING_PUBLICATION_STATUSES, default: 'draft', index: true })
  publicationStatus!: ListingPublicationStatus;

  @Prop({ type: String, enum: LISTING_AVAILABILITY_STATUSES, default: 'available' })
  availabilityStatus!: ListingAvailabilityStatus;

  @Prop({ type: ListingAttributesSchema, default: () => ({}) })
  attributes!: ListingAttributes;

  @Prop({ type: ListingPricingSchema, default: () => ({}) })
  pricing!: ListingPricing;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
