"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, BadgeCheck, LayoutDashboard, ShieldCheck, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { PublicUser } from "@bdph/types"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LocaleSwitch } from "@/components/auth/locale-switch"
import { LogoutButton } from "@/components/dashboard/logout-button"

type NavItem = { href: string; key: string; icon: LucideIcon; exact?: boolean }

// The admin sections. Every route is additionally role-gated server-side; this
// nav only decides what a staff user sees.
const NAV: NavItem[] = [
  { href: "/admin", key: "overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/moderation", key: "moderation", icon: ShieldCheck },
  { href: "/admin/sellers", key: "sellers", icon: BadgeCheck },
]

// next-intl's usePathname returns the path without the locale prefix (e.g.
// "/admin/users"), so these compare directly.
function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}

export function AdminShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const t = useTranslations("admin")
  const pathname = usePathname()
  const isSuperAdmin = user.roles.includes("super_admin")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              {t("brand")}
            </span>
            <Badge variant="secondary">{t(isSuperAdmin ? "roleSuperAdmin" : "roleAdmin")}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("backToDashboard")}
            </Link>
            <LocaleSwitch />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row md:py-10">
        <aside className="md:w-56 md:shrink-0">
          <nav aria-label={t("navLabel")} className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {NAV.map((item) => {
              const active = isActive(pathname, item)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
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
