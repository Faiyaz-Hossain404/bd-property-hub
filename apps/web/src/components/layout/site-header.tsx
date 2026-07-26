"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Building2, LogOut, Menu } from "lucide-react"
import type { PublicUser } from "@bdph/types"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { isRouteActive } from "@/lib/nav"
import { isStaff, isAdminPrime } from "@/lib/roles"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useLogout } from "@/hooks/use-logout"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LocaleSwitch } from "@/components/auth/locale-switch"
import { UserMenu } from "@/components/layout/user-menu"
import { HeaderSearch } from "@/components/layout/header-search"

type Variant = "default" | "minimal"
type NavLink = { href: string; label: string; exact?: boolean }

// The visible links, gated by role: everyone sees Home + Listings; a signed-in
// user also sees the /dashboard tab; staff additionally see the /admin tab.
// Deliberate label swap, scoped to Admin (prime) ONLY: for a prime user the
// /dashboard tab DISPLAYS "Admin (prime)" and the /admin tab DISPLAYS "Dashboard".
// Everyone else — buyers, sellers, standard admins — sees the normal labels, so a
// non-prime user is never shown an "Admin (prime)" tab. Only the visible label
// strings change; the hrefs, the isStaff/isAdminPrime gates, and the server-side
// route guards are all unchanged.
function useNavLinks(user: PublicUser | null): NavLink[] {
  const t = useTranslations("nav")
  const isPrime = isAdminPrime(user)
  const links: NavLink[] = [
    { href: "/", label: t("home"), exact: true },
    { href: "/catalog", label: t("listings") },
  ]
  if (user) links.push({ href: "/dashboard", label: isPrime ? t("superAdmin") : t("dashboard") })
  if (isStaff(user)) {
    links.push({ href: "/admin", label: isPrime ? t("dashboard") : t("admin") })
  }
  return links
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav")
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Building2 className="size-4.5" />
      </span>
      <span className="font-heading text-base font-bold tracking-tight text-foreground">
        {t("brand")}
      </span>
    </Link>
  )
}

// Presentational header. `user` is our canonical PublicUser (null = guest); the
// self-fetching wrapper for public pages is SiteHeaderAuto below.
export function SiteHeader({
  user,
  isLoading = false,
  variant = "default",
}: {
  user: PublicUser | null
  isLoading?: boolean
  variant?: Variant
}) {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const links = useNavLinks(user)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {variant === "minimal" ? (
          <div className="flex w-full items-center justify-between">
            <Brand />
            <LocaleSwitch />
          </div>
        ) : (
          <>
            <Brand />

            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {links.map((link) => {
                const active = isRouteActive(pathname, link.href, link.exact)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <HeaderSearch className="hidden w-56 lg:block" />
              <div className="hidden items-center gap-2 md:flex">
                <LocaleSwitch />
                {isLoading ? (
                  <div className="size-9 animate-pulse rounded-full bg-muted" aria-hidden />
                ) : user ? (
                  <UserMenu user={user} />
                ) : (
                  <Button asChild size="sm">
                    <Link href="/login">{t("signIn")}</Link>
                  </Button>
                )}
              </div>
              <MobileNav user={user} links={links} pathname={pathname} />
            </div>
          </>
        )}
      </div>
    </header>
  )
}

function MobileNav({
  user,
  links,
  pathname,
}: {
  user: PublicUser | null
  links: NavLink[]
  pathname: string
}) {
  const t = useTranslations("nav")
  const [open, setOpen] = useState(false)
  const { logout } = useLogout()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("openMenu")}>
          <Menu />
        </Button>
      </SheetTrigger>
      {/* aria-describedby={undefined} opts out of Radix's description requirement
          (the title alone is sufficient here) instead of shipping a dummy one. */}
      <SheetContent side="right" className="w-72" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
          <Brand onNavigate={() => setOpen(false)} />
        </SheetHeader>

        <div className="px-4">
          <HeaderSearch onNavigate={() => setOpen(false)} />
        </div>

        {user ? (
          <div className="mx-4 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        ) : null}

        <nav className="flex flex-col gap-1 px-2">
          {links.map((link) => {
            const active = isRouteActive(pathname, link.href, link.exact)
            return (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </SheetClose>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-border p-4">
          <LocaleSwitch />
          {user ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setOpen(false)
                logout()
              }}
            >
              <LogOut />
              {t("signOut")}
            </Button>
          ) : (
            <SheetClose asChild>
              <Button asChild className="w-full">
                <Link href="/login">{t("signIn")}</Link>
              </Button>
            </SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Self-fetching header for public/server pages (home, catalog) that don't already
// hold the current user. Renders as a guest while loading, then hydrates the links.
export function SiteHeaderAuto({ variant }: { variant?: Variant }) {
  const current = useCurrentUser()
  return (
    <SiteHeader user={current.user} isLoading={current.status === "loading"} variant={variant} />
  )
}
