"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle, RotateCcw } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { ApiError, restoreListing } from "@/lib/api"
import { Button } from "@/components/ui/button"

type SectionT = ReturnType<typeof useTranslations>

// Owner self-service restore for an archived listing, backed by
// POST /listings/:id/restore (LIFE-4). The listing comes back as a draft, so the
// action is safe and reversible — no confirm step (unlike withdraw). The parent
// only renders this for archived listings.
export function ListingRestore({
  listing,
  onUpdated,
  t,
}: {
  listing: PublicListing
  onUpdated: (updated: PublicListing) => void
  t: SectionT
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      try {
        const updated = await restoreListing(listing.id)
        onUpdated(updated)
      } catch (restoreError) {
        setError(restoreError instanceof ApiError ? restoreError.message : t("restoreError"))
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={handleRestore}
        disabled={isPending}
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        {isPending ? t("restoring") : t("restoreCta")}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
