import type { SellerKycStatus } from '@bdph/types';

// Pure state-machine rules for the seller verification gate (FR-S8). Kept apart
// from the service so "which status can move where" is unit-testable without a
// database, and lives in exactly one place.

// A seller may ask to be verified when they have never applied (`unverified`) or
// after a rejection (`rejected`) — the latter lets them re-apply once fixed.
// Not while already `pending` (a request is in flight) or `verified` (done).
export function canRequestVerificationFrom(status: SellerKycStatus): boolean {
  return status === 'unverified' || status === 'rejected';
}

// An admin can only decide (approve/reject) a request that is actually waiting —
// i.e. `pending`. Deciding any other status is a no-op the caller shouldn't have
// offered, so the service turns it into a 409.
export function canReviewVerificationFrom(status: SellerKycStatus): boolean {
  return status === 'pending';
}

// The gate that decides whether a seller may submit listings (`canSubmitListings`)
// is shared with the web dashboard, so it lives in @bdph/types alongside
// listingCompletenessGaps rather than here.
