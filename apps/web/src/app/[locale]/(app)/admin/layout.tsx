"use client"

import { useEffect, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { AdminShell } from "@/components/admin/admin-shell"

const ADMIN_ROLES = ["admin", "super_admin"] as const

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {children}
    </div>
  )
}

// Client-side gate for the whole /admin area. It mirrors the server-side role
// check (every /admin/* API route is guarded by SessionAuthGuard + RolesGuard) —
// this only decides what to render, never what's authorized. A signed-out user
// is bounced to login; a signed-in non-staff user to their own dashboard.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("admin")
  const router = useRouter()
  const current = useCurrentUser()

  const isAdmin =
    current.status === "authenticated" &&
    current.user.roles.some((role) =>
      ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]),
    )

  useEffect(() => {
    if (current.status === "unauthenticated") {
      router.replace("/login")
    } else if (current.status === "authenticated" && !isAdmin) {
      router.replace("/dashboard")
    }
  }, [current.status, isAdmin, router])

  if (current.status === "authenticated" && isAdmin) {
    return <AdminShell user={current.user}>{children}</AdminShell>
  }

  if (current.status === "error") {
    return (
      <Centered>
        <h1 className="font-heading text-xl font-semibold text-foreground">{t("errorTitle")}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("errorBody")}</p>
        <Button type="button" variant="outline" size="sm" className="mt-5" onClick={current.reload}>
          {t("retry")}
        </Button>
      </Centered>
    )
  }

  const message =
    current.status === "authenticated" && !isAdmin ? t("notAuthorized") : t("loading")
  return (
    <Centered>
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </Centered>
  )
}
