import type {
  AdminAssignRolesInput,
  AdminStats,
  AdminUpdateUserStatusInput,
  ApiPage,
  AssetType,
  CommitListingMediaInput,
  CreateListingInput,
  GeoAreaThana,
  GeoCityCorporation,
  GeoCityUpazila,
  GeoDistrict,
  GeoDivision,
  ListingMediaUploadTicket,
  ListingSort,
  LoginInput,
  PublicListing,
  PublicListingStatusHistoryEntry,
  PublicSavedListing,
  PublicUser,
  RegisterInput,
  RejectListingInput,
  RejectSellerVerificationInput,
  Role,
  TakedownListingInput,
  TransactionType,
  UpdateListingInput,
  UserStatus,
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

// DELETE helper. Handles both shapes we use: a 204 with no body (returns
// undefined) and a 200 that carries the `{ data }` envelope (returns the
// unwrapped payload). Throws ApiError on failure — mirrors the read/write helpers.
async function deleteJson<T = void>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network request failed', 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(messageFromBody(body, 'Request failed'), response.status);
  }

  return (body as { data: T } | null)?.data as T;
}

export function registerUser(input: RegisterInput): Promise<PublicUser> {
  return postJson<PublicUser>('/auth/register', input);
}

export function loginUser(input: LoginInput): Promise<PublicUser> {
  return postJson<PublicUser>('/auth/login', input);
}

// Exchange an active Clerk session token for our own session cookie. Sent as a
// Bearer token; the API verifies it with Clerk, resolves/links the canonical user,
// and sets the httpOnly bdph_session cookie — after this the app is authenticated
// exactly as it is after a first-party login. Throws ApiError like the others.
export async function bridgeClerkSession(
  clerkToken: string,
  signal?: AbortSignal,
): Promise<PublicUser> {
  // Bound the request: this runs on the post-auth /complete page, so a hung (not
  // failed) API must still reject — otherwise the user is stranded on the spinner
  // with no retry. On abort the fetch throws and surfaces as a retryable error. The
  // caller's `signal` (its effect cleanup) is chained in too, so unmounting the
  // bridge actually stops the in-flight authenticated request rather than only
  // ignoring its result.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/clerk/session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clerkToken}` },
      // Store the session cookie the API issues.
      credentials: 'include',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Network request failed', 0);
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(messageFromBody(body, 'Request failed'), response.status);
  }
  return (body as { data: PublicUser }).data;
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

// --- Email verification & password reset -------------------------------------
// verify/reset return the API's generic { success } body. resend/forgot always
// resolve regardless of whether the email maps to an account (no enumeration).

export function verifyEmail(token: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/auth/verify-email', { token });
}

export function resendVerification(email: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/auth/resend-verification', { email });
}

export function requestPasswordReset(email: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/auth/forgot-password', { email });
}

export function resetPassword(token: string, password: string): Promise<{ success: true }> {
  return postJson<{ success: true }>('/auth/reset-password', { token, password });
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

// Owner-only photo management (edit-status listings). Both return the refreshed
// listing so the dashboard can update in place.
export function removeListingMedia(id: string, mediaId: string): Promise<PublicListing> {
  return deleteJson<PublicListing>(`/listings/${id}/media/${mediaId}`);
}

// `order` is the full list of the listing's photo ids in the desired order;
// order[0] becomes the cover.
export function reorderListingMedia(id: string, order: string[]): Promise<PublicListing> {
  return patchJson<PublicListing>(`/listings/${id}/media/order`, { order });
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
  cityUpazilaId?: string | null;
  assetType?: AssetType | null;
  transactionType?: TransactionType | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sort?: ListingSort | null;
  // Free-text title search (DISC-8). Sent as `q`; the API escapes it server-side.
  q?: string | null;
};

export function browseListings(params: BrowseListingsParams): Promise<ApiPage<PublicListing>> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.districtId) search.set('district_id', params.districtId);
  if (params.cityUpazilaId) search.set('city_upazila_id', params.cityUpazilaId);
  if (params.assetType) search.set('asset_type', params.assetType);
  if (params.transactionType) search.set('transaction_type', params.transactionType);
  if (params.priceMin != null) search.set('price_min', String(params.priceMin));
  if (params.priceMax != null) search.set('price_max', String(params.priceMax));
  if (params.q) search.set('q', params.q);
  // 'newest' is the server default — omit it to keep the query string clean.
  if (params.sort && params.sort !== 'newest') search.set('sort', params.sort);
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

// Owner self-service withdraw (POST /listings/:id/withdraw) — archives the seller's
// own listing and pulls it from public search (LIFE-4). Reversible via
// restoreListing; the dashboard still confirms first since it drops from search.
export function withdrawListing(id: string): Promise<PublicListing> {
  return postJson<PublicListing>(`/listings/${id}/withdraw`, {});
}

// Owner self-service restore (POST /listings/:id/restore) — brings an archived
// listing back as a draft so the seller can edit and resubmit for review (LIFE-4).
export function restoreListing(id: string): Promise<PublicListing> {
  return postJson<PublicListing>(`/listings/${id}/restore`, {});
}

// Owner-or-staff transition log for a listing (GET /listings/:id/status-history).
// The API enforces access; the seller dashboard uses it to show the moderation
// trail (submitted → approved/rejected) and any rejection reason.
export function getListingStatusHistory(id: string): Promise<PublicListingStatusHistoryEntry[]> {
  return getJson<PublicListingStatusHistoryEntry[]>(`/listings/${id}/status-history`);
}

// --- Saved listings / favorites ---------------------------------------------
// All four routes are session-guarded and scoped to the current user server-side.

// The current user's saved listings, hydrated to full listings for the dashboard,
// newest-saved first. Listings no longer public (withdrawn/removed) drop off.
export function getSavedListings(): Promise<PublicListing[]> {
  return getJson<PublicListing[]>('/me/saved');
}

// Just the saved listing ids — used to render the correct save/unsave toggle
// state on the detail page without hydrating every saved listing.
export function getSavedListingIds(): Promise<string[]> {
  return getJson<string[]>('/me/saved/ids');
}

// Bookmark a listing (idempotent server-side). Returns the saved record.
export function saveListing(listingId: string): Promise<PublicSavedListing> {
  return postJson<PublicSavedListing>('/me/saved', { listingId });
}

// Remove a bookmark (idempotent server-side — unsaving something not saved is a
// no-op that still resolves).
export function unsaveListing(listingId: string): Promise<void> {
  return deleteJson(`/me/saved/${listingId}`);
}

// Public geography selectors (long-cached) backing the division → district picker.
export function getDivisions(): Promise<GeoDivision[]> {
  return getJson<GeoDivision[]>('/geo/divisions');
}

export function getDistricts(divisionId?: string): Promise<GeoDistrict[]> {
  const query = divisionId ? `?division_id=${divisionId}` : '';
  return getJson<GeoDistrict[]>(`/geo/districts${query}`);
}

// Cities/upazilas under a district (the district → upazila cascade). The full list
// is large, so callers pass a district to narrow it.
export function getCitiesUpazilas(districtId?: string): Promise<GeoCityUpazila[]> {
  const query = districtId ? `?district_id=${districtId}` : '';
  return getJson<GeoCityUpazila[]>(`/geo/cities-upazilas${query}`);
}

// Areas/thanas under a city/upazila (the upazila → area cascade).
export function getAreasThanas(cityUpazilaId?: string): Promise<GeoAreaThana[]> {
  const query = cityUpazilaId ? `?city_upazila_id=${cityUpazilaId}` : '';
  return getJson<GeoAreaThana[]>(`/geo/areas-thanas${query}`);
}

// The flat city-corporation tag list (FR-S7c) — long-cached reference data.
export function getCityCorporations(): Promise<GeoCityCorporation[]> {
  return getJson<GeoCityCorporation[]>('/geo/city-corporations');
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

// Listings staff have taken down (MOD-3) — backs the "removed listings" card.
export function getRemovedListings(): Promise<PublicListing[]> {
  return getJson<PublicListing[]>('/admin/moderation/removed');
}

export function takedownListing(caseId: string, input: TakedownListingInput): Promise<PublicListing> {
  return postJson<PublicListing>(`/admin/moderation/${caseId}/takedown`, input);
}

export function reinstateListing(caseId: string): Promise<PublicListing> {
  return postJson<PublicListing>(`/admin/moderation/${caseId}/reinstate`, {});
}

// --- Seller verification (KYC gate, FR-S8) ----------------------------------
// Seller asks to be verified so their listings can be submitted for review.
export function requestSellerVerification(): Promise<PublicUser> {
  return postJson<PublicUser>('/me/verification/request', {});
}

// Sellers waiting for a verification decision — the admin review queue.
export function getSellerVerificationQueue(): Promise<PublicUser[]> {
  return getJson<PublicUser[]>('/admin/seller-verification/queue');
}

export function approveSellerVerification(userId: string): Promise<PublicUser> {
  return postJson<PublicUser>(`/admin/seller-verification/${userId}/approve`, {});
}

export function rejectSellerVerification(
  userId: string,
  input: RejectSellerVerificationInput,
): Promise<PublicUser> {
  return postJson<PublicUser>(`/admin/seller-verification/${userId}/reject`, input);
}

// --- Admin dashboard (FR-A1/A2/A3) ------------------------------------------
// All admin routes are role-gated server-side (admin/super_admin); the web only
// mirrors that to hide the UI. A non-admin who reaches these still gets a 403.

// Aggregate analytics for the overview charts (dashboard.view_analytics).
export function getAdminStats(): Promise<AdminStats> {
  return getJson<AdminStats>('/admin/stats');
}

export type AdminUsersParams = {
  cursor?: string | null;
  q?: string | null;
  role?: Role | null;
  status?: UserStatus | null;
  limit?: number | null;
};

// Paginated user list with optional search + role/status facets. Returns the full
// `{ data, page }` envelope so the caller can pass `page.nextCursor` back.
export function getAdminUsers(params: AdminUsersParams): Promise<ApiPage<PublicUser>> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.q) search.set('q', params.q);
  if (params.role) search.set('role', params.role);
  if (params.status) search.set('status', params.status);
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return getPage<PublicUser>(`/admin/users${query ? `?${query}` : ''}`);
}

// Suspend / reactivate an account (user.suspend). Returns the refreshed user.
export function setAdminUserStatus(
  userId: string,
  input: AdminUpdateUserStatusInput,
): Promise<PublicUser> {
  return patchJson<PublicUser>(`/admin/users/${userId}/status`, input);
}

// Replace an account's roles (super_admin only, staff.assign_role).
export function setAdminUserRoles(
  userId: string,
  input: AdminAssignRolesInput,
): Promise<PublicUser> {
  return patchJson<PublicUser>(`/admin/users/${userId}/roles`, input);
}
