"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useFormatter, useTranslations } from "next-intl"
import { LoaderCircle, LineChart } from "lucide-react"
import type { AdminStats } from "@bdph/types"

import { getAdminStats } from "@/lib/api"
import { NumberTicker } from "@/components/ui/number-ticker"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CategoryDatum, TrendDatum } from "./admin-charts"

// recharts is browser-only and heavy — load the chart module lazily and skip SSR
// (Core Web Vitals: keep it out of the initial payload).
const ChartSkeleton = () => (
  <div className="flex h-[240px] items-center justify-center">
    <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
  </div>
)
const TrendAreaChart = dynamic(() => import("./admin-charts").then((m) => m.TrendAreaChart), {
  ssr: false,
  loading: ChartSkeleton,
})
const CategoryBarChart = dynamic(() => import("./admin-charts").then((m) => m.CategoryBarChart), {
  ssr: false,
  loading: ChartSkeleton,
})
const CategoryDonut = dynamic(() => import("./admin-charts").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: ChartSkeleton,
})

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; stats: AdminStats }

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <NumberTicker
          value={value}
          className={accent ? "text-3xl font-bold text-primary" : "text-3xl font-bold text-foreground"}
        />
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 p-0">
      <CardHeader className="border-b px-6 py-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-4 py-5">{children}</CardContent>
    </Card>
  )
}

export function OverviewPanel() {
  const t = useTranslations("admin")
  const format = useFormatter()
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    let active = true
    getAdminStats()
      .then((stats) => {
        if (active) setState({ status: "ready", stats })
      })
      .catch(() => {
        if (active) setState({ status: "error" })
      })
    return () => {
      active = false
    }
  }, [])

  const stats = state.status === "ready" ? state.stats : null

  // Parse a YYYY-MM-DD (UTC) day into a short localized "Jul 14" label.
  const toTrend = useMemo(
    () =>
      (points: { date: string; count: number }[]): TrendDatum[] =>
        points.map((p) => ({
          label: format.dateTime(new Date(`${p.date}T00:00:00Z`), {
            month: "short",
            day: "numeric",
          }),
          count: p.count,
        })),
    [format],
  )

  const labelBuckets = (
    kind: string,
    buckets: { key: string; count: number }[],
  ): CategoryDatum[] =>
    buckets.map((b) => ({ label: t(`breakdown.${kind}.${b.key}`), count: b.count }))

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.status === "error" || !stats) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {t("statsError")}
      </div>
    )
  }

  const { totals } = stats

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("overviewTitle")}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("overviewSubtitle")}</p>
      </div>

      {/* Headline totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={t("totals.users")} value={totals.users} />
        <StatCard label={t("totals.listings")} value={totals.listings} />
        <StatCard label={t("totals.approvedListings")} value={totals.approvedListings} accent />
        <StatCard label={t("totals.pendingModeration")} value={totals.pendingModeration} accent />
        <StatCard
          label={t("totals.pendingSellerVerification")}
          value={totals.pendingSellerVerification}
          accent
        />
        <StatCard label={t("totals.removedListings")} value={totals.removedListings} />
      </div>

      {/* Trends over the trailing 30 days */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("charts.signupsTrend")} description={t("charts.trendWindow")}>
          <TrendAreaChart data={toTrend(stats.signupsTrend)} color="var(--color-chart-2)" />
        </ChartCard>
        <ChartCard title={t("charts.listingsTrend")} description={t("charts.trendWindow")}>
          <TrendAreaChart data={toTrend(stats.listingsTrend)} color="var(--color-chart-1)" />
        </ChartCard>
      </div>

      {/* Categorical breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("charts.listingsByStatus")}>
          <CategoryBarChart data={labelBuckets("listingStatus", stats.listingsByStatus)} />
        </ChartCard>
        <ChartCard title={t("charts.usersByRole")}>
          <CategoryBarChart data={labelBuckets("role", stats.usersByRole)} />
        </ChartCard>
        <ChartCard title={t("charts.listingsByAssetType")}>
          <CategoryDonut data={labelBuckets("assetType", stats.listingsByAssetType)} />
        </ChartCard>
        <ChartCard title={t("charts.listingsByTransactionType")}>
          <CategoryDonut data={labelBuckets("transactionType", stats.listingsByTransactionType)} />
        </ChartCard>
      </div>

      {/* Visitor analytics needs the first-party event pipeline (A10) — an
          explicit placeholder rather than a faked number. */}
      <Card className="gap-0 border-dashed p-0">
        <CardContent className="flex items-center gap-3 px-6 py-5 text-sm text-muted-foreground">
          <LineChart className="size-5 shrink-0" />
          <span>{t("charts.visitorsComingSoon")}</span>
        </CardContent>
      </Card>
    </div>
  )
}
