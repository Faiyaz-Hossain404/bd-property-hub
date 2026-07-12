import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ASSET_TYPES,
  FACINGS,
  LAND_SIZE_UNITS,
  LISTING_AVAILABILITY_STATUSES,
  LISTING_MEDIA_KINDS,
  LISTING_MEDIA_STATUSES,
  LISTING_PUBLICATION_STATUSES,
  PRICE_TYPES,
  RENT_PERIODS,
  SUPPORTED_LOCALES,
  TRANSACTION_TYPES,
  type AssetType,
  type Facing,
  type LandSizeUnit,
  type ListingAvailabilityStatus,
  type ListingMediaKind,
  type ListingMediaStatus,
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

// Denormalized area-level location snapshot (DATABASE_DESIGN.md §4-§5, MAP-5).
// Copied from the geo taxonomy at write time so catalog reads can render and
// group by division/district/upazila without populating the reference collections;
// if a place is ever renamed, a backfill refreshes these snapshots. This holds only
// the administrative area — exact coordinates (exactPoint), the public fuzzed
// displayPoint (MAP-2), and address_line are separate, later fields. Division +
// district are always set; the finer levels (city/upazila, area/thana) and the
// optional city-corporation tag are present only when the seller drilled down.
@Schema({ _id: false })
export class ListingLocation {
  @Prop({ type: Types.ObjectId, ref: 'Division', required: true })
  divisionId!: Types.ObjectId;

  @Prop({ required: true })
  divisionCode!: string;

  @Prop({ required: true })
  divisionNameEn!: string;

  @Prop({ required: true })
  divisionNameBn!: string;

  @Prop({ type: Types.ObjectId, ref: 'District', required: true })
  districtId!: Types.ObjectId;

  @Prop({ required: true })
  districtCode!: string;

  @Prop({ required: true })
  districtNameEn!: string;

  @Prop({ required: true })
  districtNameBn!: string;

  @Prop({ type: Types.ObjectId, ref: 'CityUpazila', default: null })
  cityUpazilaId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  cityUpazilaCode!: string | null;

  @Prop({ type: String, default: null })
  cityUpazilaNameEn!: string | null;

  @Prop({ type: String, default: null })
  cityUpazilaNameBn!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'AreaThana', default: null })
  areaThanaId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  areaThanaCode!: string | null;

  @Prop({ type: String, default: null })
  areaThanaNameEn!: string | null;

  @Prop({ type: String, default: null })
  areaThanaNameBn!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'CityCorporation', default: null })
  cityCorporationId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  cityCorporationCode!: string | null;

  @Prop({ type: String, default: null })
  cityCorporationNameEn!: string | null;

  @Prop({ type: String, default: null })
  cityCorporationNameBn!: string | null;
}
export const ListingLocationSchema = SchemaFactory.createForClass(ListingLocation);

// One embedded media item (DATABASE_DESIGN.md §5 `media[]`). Bounded and read with
// the listing, so it is embedded rather than a separate collection. The binary
// lives in Cloudinary; this holds the storage key (`public_id`), a server-built
// delivery `url`, and the asset metadata captured at commit. Each item keeps
// Mongoose's default `_id` so it can be addressed individually (reorder/delete) by
// a later endpoint.
@Schema()
export class ListingMedia {
  @Prop({ type: String, enum: LISTING_MEDIA_KINDS, required: true })
  kind!: ListingMediaKind;

  @Prop({ type: String, enum: LISTING_MEDIA_STATUSES, default: 'ready' })
  status!: ListingMediaStatus;

  // Cloudinary public_id — the storage key the asset is addressed by.
  @Prop({ required: true })
  storageKey!: string;

  // Server-built delivery URL (strips EXIF + optimizes); stored so the read path
  // never depends on Cloudinary config being present.
  @Prop({ required: true })
  url!: string;

  @Prop({ type: String, default: null })
  format!: string | null;

  @Prop({ type: Number, default: null })
  bytes!: number | null;

  @Prop({ type: Number, default: null })
  width!: number | null;

  @Prop({ type: Number, default: null })
  height!: number | null;

  // Sort order within the listing's gallery.
  @Prop({ type: Number, default: 0 })
  position!: number;
}
export const ListingMediaSchema = SchemaFactory.createForClass(ListingMedia);

// The seller-facing draft slice of the listings aggregate (DATABASE_DESIGN.md
// §5). Area-level location and the media array are modeled below; the media
// binaries live in Cloudinary (only keys/metadata sit in `media`). Installment
// terms are populated by later endpoints.
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

  @Prop({ type: ListingLocationSchema, default: null })
  location!: ListingLocation | null;

  @Prop({ type: [ListingMediaSchema], default: [] })
  media!: ListingMedia[];
}

export const ListingSchema = SchemaFactory.createForClass(Listing);

// Backs the public catalog query (CatalogController): filter on publication +
// availability, sorted newest-first with `_id` as the cursor tiebreaker.
ListingSchema.index({ publicationStatus: 1, availabilityStatus: 1, createdAt: -1, _id: -1 });

// Backs district-faceted browse (DISC-3): the same equality + sort as above with
// the district slotted before the sort keys, so a single index covers both the
// filter and the ordering for a one-Zilla query.
ListingSchema.index({
  publicationStatus: 1,
  availabilityStatus: 1,
  'location.districtId': 1,
  createdAt: -1,
  _id: -1,
});

// Backs the city/upazila drill-down (DISC-3) — the same shape as the district
// index with the upazila slotted in, so a district+upazila browse is covered. An
// area/thana filter (finer still) rides this index and scans within the narrowed
// set; a dedicated index isn't warranted until area-level browse is common.
ListingSchema.index({
  publicationStatus: 1,
  availabilityStatus: 1,
  'location.cityUpazilaId': 1,
  createdAt: -1,
  _id: -1,
});
