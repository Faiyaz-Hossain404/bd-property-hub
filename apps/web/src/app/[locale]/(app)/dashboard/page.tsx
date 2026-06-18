"use client"

import { useEffect, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const router = useRouter()
  // Keep the hook result as one object so `status` narrows `user` (destructuring
  // would break the discriminated-union narrowing).
  const current = useCurrentUser()

  useEffect(() => {
    if (current.status === "unauthenticated") {
      router.replace("/login")
    }
  }, [current.status, router])

  if (current.status === "authenticated") {
    return <DashboardShell user={current.user} onUserRefresh={current.reload} />
  }

  if (current.status === "error") {
    return (
      <CenteredState>
        <h1 className="font-heading text-xl font-semibold text-foreground">{t("errorTitle")}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("errorBody")}</p>
        <Button type="button" variant="outline" size="sm" className="mt-5" onClick={current.reload}>
          {t("retry")}
        </Button>
      </CenteredState>
    )
  }

  // "loading", or "unauthenticated" during the brief redirect to /login.
  const message = current.status === "unauthenticated" ? t("redirecting") : t("loading")
  return (
    <CenteredState>
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </CenteredState>
  )
}
