"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { ApiError, withdrawListing } from "@/lib/api"
import { Button } from "@/components/ui/button"

type SectionT = ReturnType<typeof useTranslations>

// Owner self-service withdraw for a single listing, backed by
// POST /listings/:id/withdraw (LIFE-4 — archives the listing and removes it from
// public search). The transition is one-way (no restore yet), so we gate the call
// behind an inline confirm step rather than firing on the first click. The parent
// decides which statuses show this; archived listings never reach here.
export function ListingWithdraw({
  listing,
  onUpdated,
  t,
}: {
  listing: PublicListing
  onUpdated: (updated: PublicListing) => void
  t: SectionT
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleWithdraw() {
    setError(null)
    startTransition(async () => {
      try {
        const updated = await withdrawListing(listing.id)
        onUpdated(updated)
        setIsConfirming(false)
      } catch (withdrawError) {
        setError(withdrawError instanceof ApiError ? withdrawError.message : t("withdrawError"))
      }
    })
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-fit text-destructive hover:text-destructive"
        onClick={() => setIsConfirming(true)}
      >
        {t("withdrawCta")}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs text-foreground">{t("withdrawConfirm")}</p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="destructive" onClick={handleWithdraw} disabled={isPending}>
          {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {isPending ? t("withdrawing") : t("withdrawConfirmCta")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setIsConfirming(false)
            setError(null)
          }}
          disabled={isPending}
        >
          {t("withdrawCancel")}
        </Button>
      </div>
    </div>
  )
}
