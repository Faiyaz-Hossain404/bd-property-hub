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
// group by division/district without populating the reference collections; if a
// place is ever renamed, a backfill refreshes these snapshots. This holds only
// the administrative area — exact coordinates (exactPoint), the public fuzzed
// displayPoint (MAP-2), and address_line are separate, later fields.
@Schema({ _id: false })
export class ListingLocation {
  // Refs back to the geo collections. No standalone index here yet: the catalog
  // filter that will need it (DISC-3) should add one compound index spanning
  // publication/availability/location so it actually covers that query.
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
}
export const ListingLocationSchema = SchemaFactory.createForClass(ListingLocation);

// One embedded media item (DATABASE_DESIGN.md §5 `media[]`). Bounded and read with
// the listing, so it is embedded rather than a separate collection. An uploaded
// `photo`/`video` carries a `storageKey` (its poster/variants/dimensions filled in
// by the processing worker — a later increment) and starts `pending`; an external
// `video_link` carries a validated `externalUrl` + `provider` and is `ready` at
// once. Each item keeps Mongoose's default `_id` so it can be addressed
// individually (reorder/delete) by a later endpoint.
@Schema()
export class ListingMedia {
  @Prop({ type: String, enum: LISTING_MEDIA_KINDS, required: true })
  kind!: ListingMediaKind;

  @Prop({ type: String, enum: LISTING_MEDIA_STATUSES, default: 'pending' })
  status!: ListingMediaStatus;

  // Object-storage key for uploaded media; null for an external link.
  @Prop({ type: String, default: null })
  storageKey!: string | null;

  // Validated external URL for a `video_link`; null for uploaded media.
  @Prop({ type: String, default: null })
  externalUrl!: string | null;

  // Host provider for an external link (youtube/vimeo); null for uploaded media.
  @Prop({ type: String, default: null })
  provider!: string | null;

  // Sort order within the listing's gallery.
  @Prop({ type: Number, default: 0 })
  position!: number;

  @Prop({ type: Number, default: null })
  width!: number | null;

  @Prop({ type: Number, default: null })
  height!: number | null;

  @Prop({ type: Number, default: null })
  durationSec!: number | null;
}
export const ListingMediaSchema = SchemaFactory.createForClass(ListingMedia);

// The seller-facing draft slice of the listings aggregate (DATABASE_DESIGN.md
// §5). Area-level location and the media array are modeled below; uploaded photo/
// video bytes live in object storage (only their keys/metadata sit in `media`),
// and installment terms are populated by later endpoints.
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
