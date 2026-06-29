import type {
  ApiPage,
  AssetType,
  CommitListingMediaInput,
  CreateListingInput,
  GeoDistrict,
  GeoDivision,
  ListingMediaUploadTicket,
  LoginInput,
  PublicListing,
  PublicUser,
  RegisterInput,
  RejectListingInput,
  TransactionType,
  UpdateListingInput,
} from '@bdph/types';

// The API serves /api/v1/* with credentialed CORS (apps/api/src/main.ts). The
// default matches the workspace .env.example so dev works without extra wiring.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// status 0 is reserved for transport failures (network down / CORS / DNS) where
// no HTTP response is ever produced. Forms map status → translated copy.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = { error?: { code?: number; message?: string | string[] } };

function messageFromBody(body: unknown, fallback: string): string {
  const raw = (body as ApiErrorBody | null)?.error?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return fallback;
}

async function writeJson<T>(method: 'POST' | 'PATCH', path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Send and store the httpOnly session cookie issued by the API.
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network request failed', 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(messageFromBody(body, 'Request failed'), response.status);
  }

  // Success payloads are wrapped in the `{ data }` envelope (API_DESIGN.md).
  return (body as { data: T }).data;
}

function postJson<T>(path: string, payload: unknown): Promise<T> {
  return writeJson<T>('POST', path, payload);
}

function patchJson<T>(path: string, payload: unknown): Promise<T> {
  return writeJson<T>('PATCH', path, payload);
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      // Send the httpOnly session cookie issued by the API on login/register.
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network request failed', 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(messageFromBody(body, 'Request failed'), response.status);
  }

  return (body as { data: T }).data;
}

// Like getJson, but returns the full paginated `{ data, page }` envelope rather
// than unwrapping `.data` — the caller needs `page.nextCursor` to load more.
async function getPage<T>(path: string): Promise<ApiPage<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  } catch {
    throw new ApiError('Network request failed', 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(messageFromBody(body, 'Request failed'), response.status);
  }

  return body as ApiPage<T>;
}

export function registerUser(input: RegisterInput): Promise<PublicUser> {
  return postJson<PublicUser>('/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<PublicUser> {
  return postJson<PublicUser>('/auth/login', input);
}

// Resolves the current session's user, or throws ApiError(401) when no valid
// session cookie is present. Drives the client-side auth guard.
export function getMe(): Promise<PublicUser> {
  return getJson<PublicUser>('/auth/me');
}

// Revokes the server session and clears the cookie. Returns nothing useful;
// callers redirect to /login afterward.
export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network request failed', 0);
  }
}

export function becomeSeller(): Promise<PublicUser> {
  return postJson<PublicUser>('/me/become-seller', {});
}

export function createListingDraft(input: CreateListingInput): Promise<PublicListing> {
  return postJson<PublicListing>('/listings', input);
}

// Two-phase photo upload (FILE_STORAGE_ARCHITECTURE.md). First mint a Cloudinary
// signature, then (after the browser uploads the file straight to Cloudinary)
// commit the returned asset so the server verifies and records it.
export function getListingUploadTicket(id: string): Promise<ListingMediaUploadTicket> {
  return postJson<ListingMediaUploadTicket>(`/listings/${id}/media/presign`, {});
}

export function commitListingMedia(
  id: string,
  input: CommitListingMediaInput,
): Promise<PublicListing> {
  return postJson<PublicListing>(`/listings/${id}/media/commit`, input);
}

export function getMyListings(): Promise<PublicListing[]> {
  return getJson<PublicListing[]>('/me/listings');
}

// Public catalog browse (API_DESIGN.md §5) — anonymous, cursor-paginated. Pass
// back `page.nextCursor` verbatim to fetch the next page. Facets (FR-B1):
// `districtId` (DISC-3), asset/transaction type, and an inclusive whole-BDT price
// range. Each maps to the snake_case query param the API validates.
export type BrowseListingsParams = {
  cursor?: string | null;
  districtId?: string | null;
  assetType?: AssetType | null;
  transactionType?: TransactionType | null;
  priceMin?: number | null;
  priceMax?: number | null;
};

export function browseListings(params: BrowseListingsParams): Promise<ApiPage<PublicListing>> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.districtId) search.set('district_id', params.districtId);
  if (params.assetType) search.set('asset_type', params.assetType);
  if (params.transactionType) search.set('transaction_type', params.transactionType);
  if (params.priceMin != null) search.set('price_min', String(params.priceMin));
  if (params.priceMax != null) search.set('price_max', String(params.priceMax));
  const query = search.toString();
  return getPage<PublicListing>(`/listings${query ? `?${query}` : ''}`);
}

// Public listing detail — anonymous, serves only `approved` listings.
export function getPublicListing(id: string): Promise<PublicListing> {
  return getJson<PublicListing>(`/listings/${id}`);
}

// Owner-only partial update (PATCH /listings/:id) — used to fill in location and
// pricing on a draft before submitting. Only editable statuses are accepted
// server-side; the API returns the refreshed public projection.
export function updateListing(id: string, input: UpdateListingInput): Promise<PublicListing> {
  return patchJson<PublicListing>(`/listings/${id}`, input);
}

export function submitListingForReview(id: string): Promise<PublicListing> {
  return postJson<PublicListing>(`/listings/${id}/submit`, {});
}

// Public geography selectors (long-cached) backing the division → district picker.
export function getDivisions(): Promise<GeoDivision[]> {
  return getJson<GeoDivision[]>('/geo/divisions');
}

export function getDistricts(divisionId?: string): Promise<GeoDistrict[]> {
  const query = divisionId ? `?division_id=${divisionId}` : '';
  return getJson<GeoDistrict[]>(`/geo/districts${query}`);
}

export function getModerationQueue(): Promise<PublicListing[]> {
  return getJson<PublicListing[]>('/admin/moderation/queue');
}

export function approveListing(caseId: string): Promise<PublicListing> {
  return postJson<PublicListing>(`/admin/moderation/${caseId}/approve`, {});
}

export function rejectListing(caseId: string, input: RejectListingInput): Promise<PublicListing> {
  return postJson<PublicListing>(`/admin/moderation/${caseId}/reject`, input);
}
