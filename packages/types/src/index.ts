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
// before submitting for review; media/installmentTerms come later.
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

// --- Listing media (DATABASE_DESIGN.md §5 `media[]`) --------------------------
// A listing carries a bounded, embedded media array. Binaries live in Cloudinary
// (object storage); the DB holds only the key + metadata. Photos are uploaded
// directly to Cloudinary from the browser using a short-lived signature the API
// mints, then committed back here (FILE_STORAGE_ARCHITECTURE.md, two-phase
// presign -> commit).
export const LISTING_MEDIA_KINDS = ['photo', 'video', 'floorplan'] as const;
export type ListingMediaKind = (typeof LISTING_MEDIA_KINDS)[number];

// Uploaded media is `ready` once committed (Cloudinary transforms on delivery, so
// there is no async processing step today). `pending` is reserved for a future
// scan/processing pipeline. Only `ready` media is shown publicly.
export const LISTING_MEDIA_STATUSES = ['pending', 'ready'] as const;
export type ListingMediaStatus = (typeof LISTING_MEDIA_STATUSES)[number];

// Photo limits (MEDIA-1, FILE_STORAGE_ARCHITECTURE.md §4): at most 20 images per
// listing, each <= 10 MB, in a known web image format. Enforced server-side at
// commit time against the real uploaded asset's metadata.
export const MAX_LISTING_PHOTOS = 20;
export const MAX_LISTING_IMAGE_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const;
export type ListingImageFormat = (typeof LISTING_IMAGE_FORMATS)[number];

// Response of POST /listings/:id/media/presign. The client posts the file plus
// these fields directly to Cloudinary's upload endpoint
// (https://api.cloudinary.com/v1_1/<cloudName>/image/upload). The signature is
// short-lived (bound to `timestamp`) and never exposes the API secret.
export interface ListingMediaUploadTicket {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

// Boundary input for POST /listings/:id/media/commit — the fields Cloudinary
// returns to the client after a successful direct upload, echoed back so the
// server can verify and record them. The server re-verifies `signature` against
// the API secret, so a forged body is rejected; the client is never trusted to
// supply the final URL.
export const commitListingMediaInputSchema = z.object({
  // Cloudinary public_ids are slash/dot/dash/underscore + alnum. Constraining the
  // charset (and rejecting "..") keeps a crafted id from slipping past the
  // server's `listings/<id>/` folder-prefix check or warping the delivery URL.
  publicId: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[A-Za-z0-9._\-/]+$/, 'publicId contains invalid characters')
    .refine((value) => !value.includes('..'), 'publicId must not contain ".."'),
  version: z.coerce.number().int().positive(),
  signature: z.string().min(1).max(200),
  resourceType: z.string().min(1).max(40),
  format: z.string().min(1).max(20),
  bytes: z.coerce.number().int().positive(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});
export type CommitListingMediaInput = z.infer<typeof commitListingMediaInputSchema>;

// Client-safe projection of one media item. Only `ready` media is ever included.
// `url` is a server-built Cloudinary delivery URL (the seller never supplies it).
// Never carries storage internals or any sensitive-document data (A5).
export interface PublicListingMedia {
  id: string;
  kind: ListingMediaKind;
  url: string;
  width: number | null;
  height: number | null;
  position: number;
}

// Location selector for a listing (MAP-5). The seller picks a district (Zilla);
// the API resolves and denormalizes its parent division + bilingual names from
// the geo taxonomy, so the catalog can display and (later) facet on location
// without a join. District is the *required* selector and division is derived
// from it — the division is never sent separately, which removes any chance of a
// division/district mismatch. City/upazila/area and a precise map pin (MAP-1)
// are finer-grained, later increments.
export const listingLocationInputSchema = z.object({
  districtId: z.string().regex(/^[a-f0-9]{24}$/i, 'districtId must be a 24-character hex id'),
});
export type ListingLocationInput = z.infer<typeof listingLocationInputSchema>;

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
  location: listingLocationInputSchema.optional(),
});
export type CreateListingInput = z.infer<typeof createListingInputSchema>;

// Boundary input for PATCH /listings/:id — partial update, owner-only, only
// while the listing is in a status the owner is still allowed to edit (draft
// or rejected; see ListingsService.update).
export const updateListingInputSchema = createListingInputSchema.partial();
export type UpdateListingInput = z.infer<typeof updateListingInputSchema>;

// --- Listing completeness (FR-S8 submit gate) --------------------------------
// What a draft must have before a seller may submit it for review. Kept here as a
// single source of truth so the authoritative API gate
// (ListingsService.submitForReview) and the web dashboard's proactive
// Submit-button gating/hint can never drift apart.
//
// Price is intentionally NOT required: a listing with no price simply renders as
// "Price on request" in the catalog (see priceLabel), so a seller can submit and
// negotiate the figure later. Only an area-level location is mandatory — without
// it the listing can't appear in the district filter. Further requirements
// (legal documents, asset size) will be added here the same way once they exist.
export const LISTING_REQUIREMENTS = ['location'] as const;
export type ListingRequirement = (typeof LISTING_REQUIREMENTS)[number];

// Structural shape satisfied by both the public projection (PublicListing) and
// the Mongoose document, so neither side has to map before checking.
export interface ListingCompletenessInput {
  location: unknown;
}

// Returns the requirements a listing still fails, in display order. An empty
// array means the listing is ready to submit.
export function listingCompletenessGaps(listing: ListingCompletenessInput): ListingRequirement[] {
  const gaps: ListingRequirement[] = [];
  if (listing.location == null) gaps.push('location');
  return gaps;
}

export function isListingComplete(listing: ListingCompletenessInput): boolean {
  return listingCompletenessGaps(listing).length === 0;
}

// Boundary input for POST /admin/moderation/:caseId/reject.
export const rejectListingInputSchema = z.object({
  reason: z.string().min(1).max(1000),
});
export type RejectListingInput = z.infer<typeof rejectListingInputSchema>;

// Query params for GET /listings (public catalog browse, API_DESIGN.md §5).
// `district_id` is the first DISC-3 filter facet (the required-selector Zilla);
// `asset_type` / `transaction_type` / `price_min` / `price_max` are the "primary"
// facets (FR-B1). DISC-2 sort options (featured/price/newest) are a later
// increment. `limit` is coerced from the query string and hard-capped (DISC-7).
// `cursor` is an opaque token minted by the server — clients pass back
// `page.nextCursor` verbatim. All facet params are snake_case to match the
// documented query string.
export const PUBLIC_LISTING_PAGE_SIZE = 20;
export const PUBLIC_LISTING_MAX_PAGE_SIZE = 50;
// Catalog sort order (DISC-2). `newest` is the default keyset sort; the price
// orders sort on `pricing.amountBdt`. "Featured" waits on promoted-listing
// billing, so it's not offered yet.
export const LISTING_SORTS = ['newest', 'price_asc', 'price_desc'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];
export const publicListingQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PUBLIC_LISTING_MAX_PAGE_SIZE)
      .default(PUBLIC_LISTING_PAGE_SIZE),
    cursor: z.string().min(1).optional(),
    sort: z.enum(LISTING_SORTS).default('newest'),
    // Optional Zilla facet (DISC-3). The 24-hex constraint makes it safe to pass
    // straight into the filter.
    district_id: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, 'district_id must be a 24-character hex id')
      .optional(),
    asset_type: z.enum(ASSET_TYPES).optional(),
    transaction_type: z.enum(TRANSACTION_TYPES).optional(),
    // Inclusive price bounds in whole BDT (matches listingPricing.amountBdt). A
    // bound filters out listings without a stated price — see findPublicPage.
    price_min: z.coerce.number().int().nonnegative().optional(),
    price_max: z.coerce.number().int().nonnegative().optional(),
  })
  // A reversed range can never match; reject it at the boundary so the client
  // gets a clear 400 instead of a silently empty page.
  .refine((q) => q.price_min == null || q.price_max == null || q.price_min <= q.price_max, {
    message: 'price_min must be less than or equal to price_max',
    path: ['price_min'],
  });
export type PublicListingQuery = z.infer<typeof publicListingQuerySchema>;

// Area-level location on a listing's public projection (A5/MAP-2). Division +
// district only — administrative areas that are safe to expose anonymously.
// Exact coordinates and address_line are NEVER part of this projection; precise
// location is shared manually via chat once a deal progresses. `null` until the
// seller chooses a location (it is optional at draft time).
export interface PublicListingLocation {
  divisionId: string;
  divisionCode: string;
  divisionNameEn: string;
  divisionNameBn: string;
  districtId: string;
  districtCode: string;
  districtNameEn: string;
  districtNameBn: string;
}

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
  location: PublicListingLocation | null;
  media: PublicListingMedia[];
  createdAt: string;
  updatedAt: string;
}

// Append-only transition record returned by GET /listings/:id/status-history.
export interface PublicListingStatusHistoryEntry {
  id: string;
  listingId: string;
  fromStatus: ListingPublicationStatus;
  toStatus: ListingPublicationStatus;
  actorId: string;
  reason: string | null;
  createdAt: string;
}

// --- Geography (DATABASE_DESIGN.md §4, FR-G2 / MAP-5) ------------------------
// Canonical Bangladesh administrative hierarchy, seeded as small reference
// collections: division → district (Zilla) → city/upazila → area/thana. This
// slice ships the top two levels; the `district` (Zilla) is the viewer's
// *required* selector (MAP-5). `code` is a stable kebab slug used as the natural
// key for idempotent seeding and as a cache-friendly handle. Names are bilingual
// (EN + BN), rendered per the viewer's locale (MAP-6).
export interface GeoDivision {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
}

export interface GeoDistrict {
  id: string;
  code: string;
  divisionId: string;
  divisionCode: string;
  nameEn: string;
  nameBn: string;
}

// Query for GET /geo/districts — optional `division_id` narrows to one division
// (the cascading division → Zilla picker); omitted returns all districts.
// snake_case matches the documented geo query params (API_DESIGN.md §5); the
// value is constrained to a 24-char hex id so it is safe to pass to a Mongo query.
export const geoDistrictsQuerySchema = z.object({
  division_id: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, 'division_id must be a 24-character hex id')
    .optional(),
});
export type GeoDistrictsQuery = z.infer<typeof geoDistrictsQuerySchema>;

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
