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

// The single source of truth for "where does this user belong after signing in".
// Buyers have nothing to manage, so they land in the catalog; anyone who can
// list (seller, and admins by inheritance) lands on the dashboard. Tested
// against `roles` rather than `role` so an admin is not sent to the catalog.
//
// Locale-free on purpose: callers navigate with the locale-aware router from
// @/i18n/navigation, which prefixes the active locale (so "/catalog" resolves to
// /en/catalog or /bn/catalog).
export function postAuthPath(user: PublicUser | null | undefined): "/catalog" | "/dashboard" {
  return user?.roles.includes("seller") ? "/dashboard" : "/catalog"
}
