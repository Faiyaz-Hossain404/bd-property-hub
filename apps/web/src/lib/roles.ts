import type { PublicUser, Role } from "@bdph/types"

// Client-side role helpers for display gating. These decide what a user SEES;
// every protected route is still enforced server-side by the API guards.
//
// `user.roles` is the capability set the API derives from the single assigned
// role (admin / admin_prime expand to include seller + buyer), so testing
// membership here transparently honours the inheritance — an admin counts as
// staff and as a seller. `user.role` is the ONE assigned role, used for the prime
// identity check and the badge.
const STAFF_ROLES: Role[] = ["admin", "admin_prime"]

export function isStaff(user: PublicUser | null | undefined): boolean {
  return !!user && user.roles.some((role) => STAFF_ROLES.includes(role))
}

export function isAdminPrime(user: PublicUser | null | undefined): boolean {
  return !!user && user.role === "admin_prime"
}
