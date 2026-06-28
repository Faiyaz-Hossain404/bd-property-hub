import type {
  CommitListingMediaInput,
  CreateListingInput,
  ListingMediaUploadTicket,
  LoginInput,
  PublicListing,
  PublicUser,
  RegisterInput,
  RejectListingInput,
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

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
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

export function submitListingForReview(id: string): Promise<PublicListing> {
  return postJson<PublicListing>(`/listings/${id}/submit`, {});
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
