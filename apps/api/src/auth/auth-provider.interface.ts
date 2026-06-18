import type { AuthProviderKind, PublicUser } from '@bdph/types';

/**
 * Seam both authentication strategies implement. Whichever provider
 * authenticates a request, downstream authorization (RBAC + ownership) operates
 * on the same canonical PublicUser — see IMPLEMENTATION_PLAN.md §3.
 *
 * - LocalAuthProvider: first-party email/password (implemented here).
 * - ClerkAuthProvider: verifies a Clerk JWT and resolves our user (Phase 1 next).
 */
export interface AuthProvider {
  readonly kind: AuthProviderKind;
}

export interface AuthenticatedResult {
  user: PublicUser;
}
