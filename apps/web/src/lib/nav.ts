// Whether a nav link is "active" for the current pathname. next-intl's
// usePathname is locale-stripped, so callers pass paths like "/admin/users".
// Exact match for the root href; otherwise a prefix match bounded by "/" so
// "/admin" never matches an unrelated "/administrators".
export function isRouteActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
