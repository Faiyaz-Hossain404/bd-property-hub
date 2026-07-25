import type { PublicUser, Role } from "@bdph/types"

// Client-side role helpers for display gating. These decide what a user SEES;
// every protected route is still enforced server-side by the API guards.
const STAFF_ROLES: Role[] = ["admin", "super_admin"]

export function isStaff(user: PublicUser | null | undefined): boolean {
  return !!user && user.roles.some((role) => STAFF_ROLES.includes(role))
}

export function isSuperAdmin(user: PublicUser | null | undefined): boolean {
  return !!user && user.roles.includes("super_admin")
}
