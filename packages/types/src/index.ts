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
// `removed` is a staff takedown of an already-live (`approved`) listing (MOD-3):
// distinct from `rejected` (never went live; the seller can fix and resubmit) and
// `archived` (the seller hid their own listing and can restore it). A removed
// listing leaves the public catalog and only staff can reinstate it.
export const LISTING_PUBLICATION_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived',
  'removed',
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

// Boundary input for PATCH /listings/:id/media/order — the seller's desired photo
// order, given as the full list of the listing's photo ids (each the media item's
// `id` from PublicListingMedia). The first id becomes the cover. The service
// requires this to be a permutation of the listing's current photos — every
// existing id exactly once — so a stale or partial list is rejected rather than
// silently dropping photos.
export const reorderListingMediaInputSchema = z.object({
  order: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, 'media id must be a 24-character hex id'))
    .min(1)
    .max(MAX_LISTING_PHOTOS),
});
export type ReorderListingMediaInput = z.infer<typeof reorderListingMediaInputSchema>;

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

// Location selector for a listing (MAP-5). The seller picks a district (Zilla),
// then may drill down to a city/upazila and an area/thana, and optionally tag a
// city corporation (FR-S7c). The API resolves and denormalizes each chosen level's
// parent chain + bilingual names from the geo taxonomy, so the catalog can display
// and facet on location without a join. District is the *required* selector and
// every coarser level (division) is derived — never sent separately, which removes
// any chance of a mismatch. A precise map pin (MAP-1) is a later increment.
const HEX_ID = /^[a-f0-9]{24}$/i;
export const listingLocationInputSchema = z
  .object({
    districtId: z.string().regex(HEX_ID, 'districtId must be a 24-character hex id'),
    cityUpazilaId: z.string().regex(HEX_ID, 'cityUpazilaId must be a 24-character hex id').optional(),
    areaThanaId: z.string().regex(HEX_ID, 'areaThanaId must be a 24-character hex id').optional(),
    cityCorporationId: z
      .string()
      .regex(HEX_ID, 'cityCorporationId must be a 24-character hex id')
      .optional(),
  })
  // An area/thana is only meaningful under a city/upazila, and the API validates the
  // parent chain against the ids sent — so the finer selector can't arrive without
  // its parent. Reject it at the boundary for a clear 400 rather than a resolve-time
  // error. (The coarser levels — division — are derived server-side, never sent.)
  .refine((loc) => loc.areaThanaId == null || loc.cityUpazilaId != null, {
    message: 'cityUpazilaId is required when areaThanaId is set',
    path: ['cityUpazilaId'],
  });
export type ListingLocationInput = z.infer<typeof listingLocationInputSchema>;

// --- Map pin (MAP-1 / MAP-2) ---------------------------------------------------
// A seller may drop an exact map pin on their property. The exact point is
// PRIVATE (owner/staff only); the public ever sees only a derived point offset a
// random distance within the annulus below, so the pin conveys the neighbourhood
// without revealing the address (A5/MAP-2). The offset is drawn once at write
// time and stored — recomputing per read would let repeated reads be averaged
// back to the true location.
export const PIN_FUZZ_MIN_METERS = 150;
export const PIN_FUZZ_MAX_METERS = 400;

// Service area: a bounding box around Bangladesh (with a small margin). A pin
// outside it is a client mistake — rejected at the boundary, before any storage.
export const BANGLADESH_BOUNDS = {
  minLat: 20.3,
  maxLat: 26.7,
  minLng: 88.0,
  maxLng: 92.7,
} as const;

export const listingPinInputSchema = z.object({
  lat: z
    .number()
    .min(BANGLADESH_BOUNDS.minLat, 'pin is outside the service area')
    .max(BANGLADESH_BOUNDS.maxLat, 'pin is outside the service area'),
  lng: z
    .number()
    .min(BANGLADESH_BOUNDS.minLng, 'pin is outside the service area')
    .max(BANGLADESH_BOUNDS.maxLng, 'pin is outside the service area'),
});
export type ListingPinInput = z.infer<typeof listingPinInputSchema>;

// A plain lat/lng pair as it appears in client-safe projections.
export interface PublicGeoPoint {
  lat: number;
  lng: number;
}

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
  // Exact map pin (MAP-2): omitted = unchanged, null = remove the pin, an object
  // = set it (the server derives and stores the public fuzzed point).
  pin: listingPinInputSchema.nullable().optional(),
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

// Boundary input for POST /admin/moderation/:caseId/takedown (MOD-3). A reason is
// required — a takedown is an enforcement action, so the audit trail must record
// why the listing was pulled from the public catalog.
export const takedownListingInputSchema = z.object({
  reason: z.string().min(1).max(1000),
});
export type TakedownListingInput = z.infer<typeof takedownListingInputSchema>;

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
    // Free-text search over the listing title (DISC-8). Optional; trimmed and
    // length-capped. The service escapes it into a literal, case-insensitive regex,
    // so punctuation from user input is matched verbatim (no regex injection). A
    // blank value collapses to undefined so a stray `?q=` neither 400s nor filters
    // everything out.
    q: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    // Optional Zilla facet (DISC-3). The 24-hex constraint makes it safe to pass
    // straight into the filter.
    district_id: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, 'district_id must be a 24-character hex id')
      .optional(),
    // Optional city/upazila drill-down under the Zilla (DISC-3). Independent of
    // district_id in the query (the client may send either or both); each just
    // narrows the filter further.
    city_upazila_id: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, 'city_upazila_id must be a 24-character hex id')
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

// Area-level location on a listing's public projection (A5/MAP-2). Administrative
// areas only — division → district → city/upazila → area/thana, plus an optional
// city-corporation tag — all safe to expose anonymously. Exact coordinates and
// address_line are NEVER part of this projection; precise location is shared
// manually via chat once a deal progresses. `null` until the seller chooses a
// location (it is optional at draft time). District and division are always
// present; the finer levels are optional (a seller may stop at any depth).
export interface PublicListingLocation {
  divisionId: string;
  divisionCode: string;
  divisionNameEn: string;
  divisionNameBn: string;
  districtId: string;
  districtCode: string;
  districtNameEn: string;
  districtNameBn: string;
  cityUpazilaId?: string;
  cityUpazilaCode?: string;
  cityUpazilaNameEn?: string;
  cityUpazilaNameBn?: string;
  areaThanaId?: string;
  areaThanaCode?: string;
  areaThanaNameEn?: string;
  areaThanaNameBn?: string;
  cityCorporationId?: string;
  cityCorporationCode?: string;
  cityCorporationNameEn?: string;
  cityCorporationNameBn?: string;
}

// Client-safe projection of a listing.
export interface PublicListing {
  id: string;
  // Present ONLY in owner/staff projections. Anonymous responses omit it: a
  // stable public owner handle would let a scraper group one seller's co-located
  // listings and average their fuzzed displayPoints back toward the true
  // location (MAP-2), besides being needless account-level exposure.
  ownerId?: string;
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
  // Approximate map point (MAP-2): the seller's pin offset within
  // PIN_FUZZ_MIN/MAX_METERS. Null when the seller hasn't dropped a pin. This is
  // the ONLY point anonymous viewers ever see.
  displayPoint: PublicGeoPoint | null;
  // The seller's exact pin — present ONLY in projections built for the listing's
  // owner or staff (never in catalog/detail responses for other viewers).
  exactPoint?: PublicGeoPoint;
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

// --- Saved listings / favorites ---------------------------------------------
// A buyer can bookmark listings to revisit them from their dashboard. A save is
// one (user, listing) pair — see SavedListing schema. Saving is idempotent, so
// the same listing can only be saved once per user.

// A soft per-user cap on how many listings one buyer may save. Not a security
// boundary — it bounds the favorites collection and keeps the dashboard's
// hydration query ($in over saved ids) tractable. Enforced in
// SavedListingsService.save before the upsert.
export const MAX_SAVED_LISTINGS = 500;

// Boundary input for POST /me/saved. Only a 24-hex listing id is accepted; the
// service additionally checks the listing exists and is publicly viewable.
export const saveListingInputSchema = z.object({
  listingId: z.string().regex(/^[a-f0-9]{24}$/i, 'listingId must be a 24-character hex id'),
});
export type SaveListingInput = z.infer<typeof saveListingInputSchema>;

// Client-safe projection of a saved-listing record (the favorite itself, not the
// listing). The full listing is hydrated separately via GET /me/saved.
export interface PublicSavedListing {
  id: string;
  listingId: string;
  createdAt: string;
}

// --- Geography (DATABASE_DESIGN.md §4, FR-G2 / MAP-5) ------------------------
// Canonical Bangladesh administrative hierarchy, seeded as small reference
// collections: division → district (Zilla) → city/upazila → area/thana, plus a
// flat list of city corporations (an optional tag). The `district` (Zilla) is the
// viewer's *required* selector (MAP-5); the finer levels are the drill-down. `code`
// is a stable kebab slug used as the natural key for idempotent seeding and as a
// cache-friendly handle. Names are bilingual (EN + BN), rendered per the viewer's
// locale (MAP-6).
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

export interface GeoCityUpazila {
  id: string;
  code: string;
  districtId: string;
  districtCode: string;
  nameEn: string;
  nameBn: string;
}

export interface GeoAreaThana {
  id: string;
  code: string;
  cityUpazilaId: string;
  cityUpazilaCode: string;
  nameEn: string;
  nameBn: string;
}

export interface GeoCityCorporation {
  id: string;
  code: string;
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

// Query for GET /geo/cities-upazilas — optional `district_id` narrows to one
// district (the district → city/upazila cascade); omitted returns all.
export const geoCitiesUpazilasQuerySchema = z.object({
  district_id: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, 'district_id must be a 24-character hex id')
    .optional(),
});
export type GeoCitiesUpazilasQuery = z.infer<typeof geoCitiesUpazilasQuerySchema>;

// Query for GET /geo/areas-thanas — optional `city_upazila_id` narrows to one
// city/upazila (the city/upazila → area/thana cascade); omitted returns all.
export const geoAreasThanasQuerySchema = z.object({
  city_upazila_id: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, 'city_upazila_id must be a 24-character hex id')
    .optional(),
});
export type GeoAreasThanasQuery = z.infer<typeof geoAreasThanasQuerySchema>;

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

// --- Seller verification (KYC) ----------------------------------------------
// A seller must be verified before any of their listings can be submitted for
// review and made public (FR-S7/FR-S8). This is the verification *status* gate;
// uploading and reviewing the actual NID / TAX-land documents is a separate,
// later increment. Lifecycle: unverified → (seller requests) → pending →
// (admin decides) → verified | rejected; a rejected seller may request again.
export const SELLER_KYC_STATUSES = ['unverified', 'pending', 'verified', 'rejected'] as const;
export type SellerKycStatus = (typeof SELLER_KYC_STATUSES)[number];

// The seller verification gate (FR-S8): a listing can only be submitted for
// review once its owner is verified. Shared by the API (authoritative check in
// submitForReview) and the web dashboard (mirrors it to disable Submit with a
// hint), so it lives here beside listingCompletenessGaps — one definition, both
// sides. Staff (admin/super_admin) don't list properties in practice, but if they
// own a listing the same rule applies; there is no seller-role carve-out here.
export function canSubmitListings(kycStatus: SellerKycStatus): boolean {
  return kycStatus === 'verified';
}

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
  // Seller verification gate (FR-S8). 'unverified' for buyers who never applied.
  kycStatus: SellerKycStatus;
  // Admin's note on the latest rejection, shown to the seller; null otherwise.
  kycReason: string | null;
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

// Admin's reason when rejecting a seller's verification request (shown to the
// seller so they know what to fix before requesting again).
export const rejectSellerVerificationInputSchema = z.object({
  reason: z.string().min(1).max(1000),
});
export type RejectSellerVerificationInput = z.infer<typeof rejectSellerVerificationInputSchema>;

// --- Email verification & password reset -------------------------------------
// Opaque tokens are delivered by email; the client only echoes them back. A
// non-empty string is all the boundary can assert — the API validates the token
// against its store (hash match, purpose, single-use, not expired).
export const verifyEmailInputSchema = z.object({
  token: z.string().min(1).max(512),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

// Request a fresh verification email. Kept separate from login so an unverified
// user can re-trigger it. The response is always generic (no account enumeration).
export const resendVerificationInputSchema = z.object({
  email: z.string().email(),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>;

// Start a password reset. Always answered generically regardless of whether the
// email maps to an account (no enumeration).
export const requestPasswordResetInputSchema = z.object({
  email: z.string().email(),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;

// Complete a password reset with the emailed token and a new password (same
// strength rule as registration).
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// --- Admin dashboard (FR-A1/A2/A3) ------------------------------------------
// The analytics dashboard is aggregate-only (USER_ROLES.md §6): counts and
// time-series, never individual PII beyond what the users table already exposes.
// Every field below is computed server-side from data that exists today
// (listings, users, the moderation/verification queues). Visitor analytics
// (FR-A3) needs the first-party event pipeline (A10) and is a later increment —
// it is deliberately absent here rather than faked.

// A named bucket in a categorical breakdown (e.g. one publication status, one
// role). `key` is the raw enum value; the client localizes the label.
export interface AdminBreakdownBucket {
  key: string;
  count: number;
}

// One day in a 30-day time series. `date` is an ISO calendar day (YYYY-MM-DD, UTC)
// so the client can render/localize it; every day in the window is present
// (zero-filled) so the chart has no gaps.
export interface AdminDailyPoint {
  date: string;
  count: number;
}

// How many trailing days the dashboard time-series charts cover.
export const ADMIN_TRENDS_WINDOW_DAYS = 30;

// The full analytics payload behind GET /admin/stats.
export interface AdminStats {
  // Headline totals for the stat cards.
  totals: {
    users: number;
    listings: number;
    approvedListings: number;
    pendingModeration: number;
    pendingSellerVerification: number;
    removedListings: number;
  };
  // Categorical breakdowns for the bar/pie charts.
  usersByRole: AdminBreakdownBucket[];
  usersByStatus: AdminBreakdownBucket[];
  listingsByStatus: AdminBreakdownBucket[];
  listingsByAssetType: AdminBreakdownBucket[];
  listingsByTransactionType: AdminBreakdownBucket[];
  // New signups / new listings per day over the trailing window.
  signupsTrend: AdminDailyPoint[];
  listingsTrend: AdminDailyPoint[];
}

// --- Admin user management (FR-A1, user.suspend, staff.assign_role) ---------
// The set of statuses an admin can move an account to through the users table.
// Intentionally narrower than USER_STATUSES: 'deleted' is a separate destructive
// flow, and 'pending_verification' is owned by the email-verification lifecycle,
// not a manual admin toggle.
export const ADMIN_SETTABLE_USER_STATUSES = ['active', 'suspended'] as const;
export type AdminSettableUserStatus = (typeof ADMIN_SETTABLE_USER_STATUSES)[number];

export const ADMIN_USERS_PAGE_LIMIT_DEFAULT = 20;
export const ADMIN_USERS_PAGE_LIMIT_MAX = 100;

// Query for the admin users list. Free-text `q` matches name/email (escaped
// server-side); `role`/`status` narrow the list; `cursor` is the opaque keyset
// token from the previous page. All optional — the bare call lists newest first.
export const adminUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ADMIN_USERS_PAGE_LIMIT_MAX)
    .default(ADMIN_USERS_PAGE_LIMIT_DEFAULT),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

// Suspend / reactivate an account. The service enforces the privilege rules
// (can't act on yourself, admins can't touch staff — see admin-users.service.ts).
export const adminUpdateUserStatusInputSchema = z.object({
  status: z.enum(ADMIN_SETTABLE_USER_STATUSES),
});
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusInputSchema>;

// Replace an account's roles (super_admin only). At least one role is required;
// duplicates are collapsed server-side. The service blocks a super admin from
// changing their own roles (no self-lockout / self-demotion of the last admin).
export const adminAssignRolesInputSchema = z.object({
  roles: z.array(z.enum(ROLES)).min(1).max(ROLES.length),
});
export type AdminAssignRolesInput = z.infer<typeof adminAssignRolesInputSchema>;
