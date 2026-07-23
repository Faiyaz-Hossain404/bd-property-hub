// Shapes for the Clerk webhook payloads we consume, plus small helpers for
// deriving the canonical email + display name from them. Clerk sends snake_case
// fields in webhook events (the Backend API `User` resource is camelCase — that
// is handled separately in ClerkService.getProfile).

export interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

export interface ClerkUserData {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface ClerkDeletedData {
  id?: string;
  deleted?: boolean;
}

// Only the event types we act on are narrowed; anything else is acknowledged and
// ignored, so Clerk enabling extra events never breaks the endpoint.
export type ClerkWebhookEvent =
  | { type: 'user.created' | 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: ClerkDeletedData }
  | { type: string; data: unknown };

// The primary email if flagged, else the first on file. Lower-cased to match how
// the user record stores and dedupes email. Null when the Clerk user has none.
export function pickPrimaryEmail(data: ClerkUserData): string | null {
  const list = data.email_addresses ?? [];
  const primary = data.primary_email_address_id
    ? list.find((entry) => entry.id === data.primary_email_address_id)
    : undefined;
  const chosen = primary ?? list[0];
  return chosen?.email_address?.toLowerCase() ?? null;
}

// The user record requires a non-empty name. Prefer the Clerk full name, fall
// back to the email's local part, and never return an empty string.
export function buildDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string,
): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || email.split('@')[0] || 'User';
}
