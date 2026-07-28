"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { BadgeCheck, LayoutDashboard, ShieldCheck, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { PublicUser } from "@bdph/types"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { isRouteActive } from "@/lib/nav"
import { SiteHeader } from "@/components/layout/site-header"
import { PAGE_CONTAINER } from "@/lib/layout"

type NavItem = { href: string; key: string; icon: LucideIcon; exact?: boolean }

// The admin sections. Every route is additionally role-gated server-side; this
// nav only decides what a staff user sees.
const NAV: NavItem[] = [
  { href: "/admin", key: "overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/moderation", key: "moderation", icon: ShieldCheck },
  { href: "/admin/sellers", key: "sellers", icon: BadgeCheck },
]

export function AdminShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const t = useTranslations("admin")
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader user={user} />

      <div className={`${PAGE_CONTAINER} flex flex-col gap-8 py-8 md:flex-row md:py-10`}>
        <aside className="md:w-56 md:shrink-0">
          <nav
            aria-label={t("navLabel")}
            className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
          >
            {NAV.map((item) => {
              const active = isRouteActive(pathname, item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {t(`nav.${item.key}`)}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
