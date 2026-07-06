import type { ListingPublicationStatus } from '@bdph/types';

// Pure state-machine rules for staff moderation of the listing lifecycle (MOD-3).
// Kept separate from ListingsService so the "which status can move where" logic is
// unit-testable without a database, and lives in exactly one place.

// A staff takedown pulls a *live* listing out of the public catalog. Only an
// `approved` listing is live, so that is the only status a takedown applies to —
// draft/pending/rejected never reached the public catalog, and archived/removed
// are already out of it.
export function canTakeDownFrom(status: ListingPublicationStatus): boolean {
  return status === 'approved';
}

// Reinstating undoes a takedown, so it applies only to a `removed` listing; it
// returns straight to `approved` (the state it was taken down from).
export function canReinstateFrom(status: ListingPublicationStatus): boolean {
  return status === 'removed';
}

// A listing staff have removed is frozen for the owner: they can't withdraw,
// edit, resubmit, or restore it. This guards the one owner action (withdraw) that
// would otherwise route a removed listing to `archived` and, via restore, back
// into the submit → review flow — bypassing the takedown.
export function isStaffLocked(status: ListingPublicationStatus): boolean {
  return status === 'removed';
}
