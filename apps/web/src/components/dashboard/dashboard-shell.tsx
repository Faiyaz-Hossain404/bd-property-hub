"use client"

import type { ReactNode } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { ArrowRight, Gauge } from "lucide-react"
import type { PublicUser, UserStatus } from "@bdph/types"

import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DotPattern } from "@/components/ui/dot-pattern"
import { LocaleSwitch } from "@/components/auth/locale-switch"
import { LogoutButton } from "@/components/dashboard/logout-button"
import { ListingsSection } from "@/components/dashboard/listings-section"
import { SavedSection } from "@/components/dashboard/saved-section"
import { SellerVerificationSection } from "@/components/dashboard/seller-verification-section"

const MODERATOR_ROLES = ["admin", "super_admin"] as const
const SELLER_ROLE = "seller"

type Props = { user: PublicUser; onUserRefresh: () => void }

function statusVariant(status: UserStatus): "default" | "outline" | "destructive" {
  if (status === "active") return "default"
  if (status === "suspended" || status === "deleted") return "destructive"
  return "outline"
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  )
}

export function DashboardShell({ user, onUserRefresh }: Props) {
  const t = useTranslations("dashboard")
  const format = useFormatter()
  const memberSince = format.dateTime(new Date(user.createdAt), { dateStyle: "medium" })
  const isModerator = user.roles.some((role) =>
    MODERATOR_ROLES.includes(role as (typeof MODERATOR_ROLES)[number]),
  )
  const isSeller = user.roles.includes(SELLER_ROLE)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            {t("brand")}
          </span>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <DotPattern
          className={cn(
            "text-olive/20",
            "mask-[radial-gradient(520px_circle_at_top_right,white,transparent)]",
          )}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("welcome", { name: user.name })}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{t("welcomeSubtitle")}</p>

          <Card className="mt-10 max-w-2xl gap-0 p-0">
            <CardHeader className="border-b px-6 py-5">
              <CardTitle className="text-lg">{t("accountTitle")}</CardTitle>
              <CardDescription>{t("accountDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 px-6 py-2">
              <Row label={t("emailLabel")}>
                <span className="text-foreground">{user.email}</span>
                <Badge variant={user.emailVerified ? "default" : "outline"}>
                  {user.emailVerified ? t("emailVerified") : t("emailUnverified")}
                </Badge>
              </Row>

              <Row label={t("rolesLabel")}>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {t(`roles.${role}`)}
                    </Badge>
                  ))}
                </div>
              </Row>

              <Row label={t("statusLabel")}>
                <Badge variant={statusVariant(user.status)}>{t(`statuses.${user.status}`)}</Badge>
              </Row>

              <Row label={t("memberSince")}>
                <span className="text-foreground">{memberSince}</span>
              </Row>
            </CardContent>
          </Card>

          {isModerator ? (
            <Link
              href="/admin"
              className="group mt-10 flex max-w-2xl items-center justify-between gap-4 rounded-xl bg-primary px-6 py-5 text-primary-foreground ring-1 ring-foreground/10 transition-colors hover:bg-primary/90"
            >
              <span className="flex items-center gap-3">
                <Gauge className="size-5" />
                <span>
                  <span className="block font-heading font-semibold">{t("adminCta.title")}</span>
                  <span className="block text-sm text-primary-foreground/80">
                    {t("adminCta.subtitle")}
                  </span>
                </span>
              </span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}
          {isSeller ? (
            <SellerVerificationSection user={user} onUserRefresh={onUserRefresh} />
          ) : null}
          <ListingsSection user={user} onUserRefresh={onUserRefresh} />
          <SavedSection />
        </div>
      </main>
    </div>
  )
}
