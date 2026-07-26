"use client"

import { useTranslations } from "next-intl"
import { Gauge, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react"
import type { PublicUser } from "@bdph/types"

import { Link } from "@/i18n/navigation"
import { useLogout } from "@/hooks/use-logout"
import { isStaff, isAdminPrime } from "@/lib/roles"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// First letters of the first two words, e.g. "Sifath Hossain" -> "SH". Falls back
// to the first email character so an avatar is never blank.
function initials(name: string, email: string): string {
  const fromName = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
  return (fromName || email[0] || "?").toUpperCase()
}

// The signed-in avatar + dropdown. Driven by our own canonical PublicUser (not
// Clerk's <UserButton>), so the account links and the dual sign-out stay in step
// with the app's session model.
export function UserMenu({ user }: { user: PublicUser }) {
  const t = useTranslations("nav")
  const { logout } = useLogout()
  const staff = isStaff(user)
  const adminPrime = isAdminPrime(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("account")}
        className="flex items-center gap-2 rounded-full p-1 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:pr-3"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20">
          {initials(user.name, user.email)}
        </span>
        <span className="hidden max-w-40 min-w-0 flex-col text-left leading-tight lg:flex">
          <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard />
            {t("dashboard")}
          </Link>
        </DropdownMenuItem>
        {staff ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              {adminPrime ? <ShieldCheck /> : <Gauge />}
              {adminPrime ? t("superAdmin") : t("admin")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault()
            logout()
          }}
        >
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
