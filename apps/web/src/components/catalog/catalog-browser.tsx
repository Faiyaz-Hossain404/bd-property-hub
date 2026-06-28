"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { browseListings } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ListingCard } from "./listing-card"

type Status = "loading" | "ready" | "error"

// Client-side, cursor-paginated catalog grid. Fetches page 1 on mount and appends
// pages on demand via the opaque cursor the API returns. Fetching client-side
// (rather than in the RSC) keeps the static shell free of a build-time API call,
// matching the dashboard's pattern.
export function CatalogBrowser() {
  const t = useTranslations("catalog")
  const [listings, setListings] = useState<PublicListing[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreError, setHasMoreError] = useState(false)
  // Guard against React StrictMode's double-invoked mount effect loading page 1 twice.
  const startedRef = useRef(false)

  const loadFirstPage = useCallback(async () => {
    setStatus("loading")
    try {
      const page = await browseListings({})
      setListings(page.data)
      setCursor(page.page.nextCursor)
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void loadFirstPage()
  }, [loadFirstPage])

  async function handleLoadMore() {
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)
    setHasMoreError(false)
    try {
      const page = await browseListings({ cursor })
      setListings((prev) => [...prev, ...page.data])
      setCursor(page.page.nextCursor)
    } catch {
      // Keep what's already loaded; surface a soft error so the user can retry.
      setHasMoreError(true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
        <p className="mt-3 text-sm">{t("loading")}</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-destructive">{t("loadError")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void loadFirstPage()}
        >
          {t("retry")}
        </Button>
      </div>
    )
  }

  if (listings.length === 0) {
    return <p className="py-24 text-center text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      {cursor ? (
        <div className="mt-10 flex flex-col items-center gap-3">
          {hasMoreError ? <p className="text-sm text-destructive">{t("loadError")}</p> : null}
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isLoadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
