"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft } from "lucide-react"

import { Link, useRouter } from "@/i18n/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import { SiteHeader } from "@/components/layout/site-header"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { DraftsGrid } from "@/components/dashboard/drafts-grid"
import { PAGE_CONTAINER } from "@/lib/layout"

// Dedicated drafts surface. A client component for the same reason
// dashboard/page.tsx is one: the session lives behind /auth/me, so the guard has
// to run after the current user resolves rather than at request time.
export default function DraftsPage() {
  const t = useTranslations("dashboard.drafts")
  const router = useRouter()
  const current = useCurrentUser()

  useEffect(() => {
    if (current.status === "unauthenticated") {
      router.replace("/login")
    }
  }, [current.status, router])

  if (current.status !== "authenticated") {
    return <DashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader user={current.user} />

      <main className={`${PAGE_CONTAINER} py-12 md:py-16`}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("backToDashboard")}
        </Link>

        <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("subtitle")}</p>

        <DraftsGrid user={current.user} />
      </main>
    </div>
  )
}
