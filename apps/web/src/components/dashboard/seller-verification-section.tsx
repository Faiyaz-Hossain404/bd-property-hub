"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { BadgeCheck, Clock, LoaderCircle, ShieldX } from "lucide-react"

import type { PublicUser } from "@bdph/types"
import { ApiError, requestSellerVerification } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Props = { user: PublicUser; onUserRefresh: () => void }

// Seller-facing verification card (FR-S8). Shows where the seller stands and,
// when they can, lets them apply. A seller can create drafts while unverified but
// can't submit a listing for review until verified — see ListingsSection's gate.
export function SellerVerificationSection({ user, onUserRefresh }: Props) {
  const t = useTranslations("dashboard.verification")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const status = user.kycStatus

  function handleRequest() {
    setError(null)
    startTransition(async () => {
      try {
        await requestSellerVerification()
        onUserRefresh()
      } catch (caughtError) {
        setError(caughtError instanceof ApiError ? caughtError.message : t("requestError"))
      }
    })
  }

  const canRequest = status === "unverified" || status === "rejected"

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="font-heading text-xl font-semibold text-foreground">{t("sectionTitle")}</h2>
      <Card className="mt-4 gap-0 p-0">
        <CardHeader className="border-b px-6 py-5">
          <CardTitle className="text-lg">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 py-5 text-sm">
          {status === "verified" ? (
            <p className="flex items-center gap-2 text-foreground">
              <BadgeCheck className="size-5 shrink-0 text-olive" />
              {t("verified")}
            </p>
          ) : null}

          {status === "pending" ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-5 shrink-0" />
              {t("pending")}
            </p>
          ) : null}

          {status === "unverified" ? <p className="text-muted-foreground">{t("unverified")}</p> : null}

          {status === "rejected" ? (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-2 text-destructive">
                <ShieldX className="size-5 shrink-0" />
                {t("rejected")}
              </p>
              {user.kycReason ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-foreground/80">
                  {t("reason", { reason: user.kycReason })}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}

          {canRequest ? (
            <Button type="button" onClick={handleRequest} disabled={isPending} className="w-fit">
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {status === "rejected" ? t("requestAgainCta") : t("requestCta")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
