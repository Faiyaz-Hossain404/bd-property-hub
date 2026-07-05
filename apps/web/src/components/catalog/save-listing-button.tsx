"use client"

import { useEffect, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Heart, LoaderCircle } from "lucide-react"

import { ApiError, getSavedListingIds, saveListing, unsaveListing } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"

// Save/unsave toggle for a single listing on the public detail page. Favorites
// require an account, so anonymous viewers get a "sign in to save" link instead
// of a live toggle. For a signed-in buyer we fetch their saved ids once to seed
// the initial state, then toggle optimistically with rollback on failure — the
// API enforces the real state (idempotent save/unsave scoped to the caller).
export function SaveListingButton({ listingId }: { listingId: string }) {
  const t = useTranslations("catalog.save")
  const { status } = useCurrentUser()
  const [isSaved, setIsSaved] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (status !== "authenticated") return
    let active = true
    getSavedListingIds()
      .then((ids) => {
        if (active) setIsSaved(ids.includes(listingId))
      })
      .catch(() => {
        // Treat a lookup failure as "not saved" so the button stays usable; a
        // failed save/unsave below still surfaces its own error.
        if (active) setIsSaved(false)
      })
    return () => {
      active = false
    }
  }, [status, listingId])

  if (status !== "authenticated") {
    return (
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href="/login">
          <Heart className="size-4" />
          {t("signInToSave")}
        </Link>
      </Button>
    )
  }

  function handleToggle() {
    if (isSaved === null || isPending) return
    setError(null)
    const next = !isSaved
    setIsSaved(next)
    startTransition(async () => {
      try {
        if (next) await saveListing(listingId)
        else await unsaveListing(listingId)
      } catch (toggleError) {
        setIsSaved(!next)
        setError(toggleError instanceof ApiError ? toggleError.message : t("error"))
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={isSaved ? "default" : "outline"}
        size="sm"
        className="w-fit"
        onClick={handleToggle}
        disabled={isSaved === null || isPending}
        aria-pressed={isSaved === true}
      >
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Heart className={isSaved ? "size-4 fill-current" : "size-4"} />
        )}
        {isSaved === null ? t("loading") : isSaved ? t("saved") : t("save")}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
