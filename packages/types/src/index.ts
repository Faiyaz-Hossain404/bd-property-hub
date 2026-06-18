import { z } from 'zod';

// --- Locales & roles ---------------------------------------------------------
export const SUPPORTED_LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const ROLES = ['super_admin', 'admin', 'customer_support', 'seller', 'buyer'] as const;
export type Role = (typeof ROLES)[number];

// --- Money -------------------------------------------------------------------
// Stored as integer minor units (poisha) to avoid floating-point drift; the
// ledger and co-ownership invariants in DATABASE_DESIGN.md rely on this.
export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.literal('BDT'),
});
export type Money = z.infer<typeof moneySchema>;

// --- Listing state machine ---------------------------------------------------
export const LISTING_PUBLICATION_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived',
] as const;
export type ListingPublicationStatus = (typeof LISTING_PUBLICATION_STATUSES)[number];

export const LISTING_AVAILABILITY_STATUSES = ['available', 'pending', 'sold', 'rented'] as const;
export type ListingAvailabilityStatus = (typeof LISTING_AVAILABILITY_STATUSES)[number];

// --- Listings (DATABASE_DESIGN.md §5) -----------------------------------------
export const ASSET_TYPES = ['apartment', 'land', 'building', 'warehouse', 'factory'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const TRANSACTION_TYPES = ['sale', 'rent', 'shared_ownership'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PRICE_TYPES = ['fixed', 'negotiable', 'on_request'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const RENT_PERIODS = ['monthly', 'yearly'] as const;
export type RentPeriod = (typeof RENT_PERIODS)[number];

export const LAND_SIZE_UNITS = ['katha', 'sqft'] as const;
export type LandSizeUnit = (typeof LAND_SIZE_UNITS)[number];

export const FACINGS = ['north', 'south', 'east', 'west'] as const;
export type Facing = (typeof FACINGS)[number];

// Filterable attributes. All optional at draft time — a seller fills these in
// before submitting for review; geo/media/installmentTerms come later.
export const listingAttributesSchema = z.object({
  facing: z.enum(FACINGS).optional(),
  roadSizeFt: z.number().nonnegative().optional(),
  rooms: z.number().int().nonnegative().optional(),
  baranda: z.number().int().nonnegative().optional(),
  washrooms: z.number().int().nonnegative().optional(),
  areaSqft: z.number().nonnegative().optional(),
  landSizeValue: z.number().nonnegative().optional(),
  landSizeUnit: z.enum(LAND_SIZE_UNITS).optional(),
});
export type ListingAttributes = z.infer<typeof listingAttributesSchema>;

export const listingPricingSchema = z.object({
  amountBdt: z.number().int().nonnegative().optional(),
  priceType: z.enum(PRICE_TYPES).optional(),
  rentPeriod: z.enum(RENT_PERIODS).optional(),
});
export type ListingPricing = z.infer<typeof listingPricingSchema>;

// Boundary input for POST /listings (create draft) — only what a seller must
// supply to start; the rest is filled in via PATCH before submit.
export const createListingInputSchema = z.object({
  titleEn: z.string().min(1).max(200),
  titleBn: z.string().min(1).max(200).optional(),
  descriptionEn: z.string().max(5000).optional(),
  descriptionBn: z.string().max(5000).optional(),
  assetType: z.enum(ASSET_TYPES),
  transactionType: z.enum(TRANSACTION_TYPES),
  attributes: listingAttributesSchema.optional(),
  pricing: listingPricingSchema.optional(),
});
export type CreateListingInput = z.infer<typeof createListingInputSchema>;

// Client-safe projection of a listing.
export interface PublicListing {
  id: string;
  ownerId: string;
  titleEn: string;
  titleBn: string | null;
  descriptionEn: string | null;
  descriptionBn: string | null;
  originalLanguage: Locale;
  assetType: AssetType;
  transactionType: TransactionType;
  isGroupPurchase: boolean;
  publicationStatus: ListingPublicationStatus;
  availabilityStatus: ListingAvailabilityStatus;
  attributes: ListingAttributes;
  pricing: ListingPricing;
  createdAt: string;
  updatedAt: string;
}

// --- API envelopes (API_DESIGN.md) ------------------------------------------
export interface ApiData<T> {
  data: T;
}

export interface ApiPage<T> {
  data: T[];
  page: {
    nextCursor: string | null;
    limit: number;
  };
}

export interface ApiError {
  error: {
    code: number;
    message: string | string[];
  };
}

// --- Users & authentication --------------------------------------------------
export const USER_STATUSES = ['active', 'suspended', 'pending_verification', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Both providers resolve to one canonical user; this names which one was used.
export const AUTH_PROVIDERS = ['local', 'clerk'] as const;
export type AuthProviderKind = (typeof AUTH_PROVIDERS)[number];

// Client-safe projection of a user — never carries the password hash.
export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  phone: string | null;
  roles: Role[];
  status: UserStatus;
  locale: Locale;
  hasPassword: boolean;
  hasClerkLink: boolean;
  createdAt: string;
}

// Boundary input schemas — validated at the API edge with Zod.
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;
