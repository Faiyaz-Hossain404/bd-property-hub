"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { browseListings, type BrowseListingsParams } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ListingCard } from "./listing-card"
import type { CatalogFilterValue } from "./catalog-filters.types"

type Status = "loading" | "ready" | "error"

// Translate the raw filter value into the typed browse params; empty strings drop
// out so they never reach the query string.
function toBrowseParams(filters: CatalogFilterValue): BrowseListingsParams {
  return {
    districtId: filters.districtId || null,
    assetType: filters.assetType || null,
    transactionType: filters.transactionType || null,
    priceMin: filters.priceMin.trim() ? Number(filters.priceMin) : null,
    priceMax: filters.priceMax.trim() ? Number(filters.priceMax) : null,
  }
}

// Client-side, cursor-paginated catalog grid. Fetches page 1 on mount and reloads
// it whenever the active filters change; appends further pages on demand via the
// opaque cursor the API returns. Fetching client-side (rather than in the RSC)
// keeps the static shell free of a build-time API call, matching the dashboard's
// pattern. A request-id guard discards stale responses so a slow first load can't
// overwrite a newer filtered one (and absorbs StrictMode's double mount effect).
export function CatalogBrowser({ filters }: { filters: CatalogFilterValue }) {
  const t = useTranslations("catalog")
  const [listings, setListings] = useState<PublicListing[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreError, setHasMoreError] = useState(false)
  const requestIdRef = useRef(0)
  const { districtId, assetType, transactionType, priceMin, priceMax } = filters

  const loadFirstPage = useCallback(async () => {
    const requestId = (requestIdRef.current += 1)
    setStatus("loading")
    try {
      const page = await browseListings(
        toBrowseParams({ districtId, assetType, transactionType, priceMin, priceMax }),
      )
      if (requestId !== requestIdRef.current) return
      setListings(page.data)
      setCursor(page.page.nextCursor)
      setStatus("ready")
    } catch {
      if (requestId !== requestIdRef.current) return
      setStatus("error")
    }
  }, [districtId, assetType, transactionType, priceMin, priceMax])

  useEffect(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  async function handleLoadMore() {
    if (!cursor || isLoadingMore) return
    const requestId = requestIdRef.current
    setIsLoadingMore(true)
    setHasMoreError(false)
    try {
      const page = await browseListings({
        cursor,
        ...toBrowseParams({ districtId, assetType, transactionType, priceMin, priceMax }),
      })
      // A filter change since this fetch started reloaded page 1 (bumping the
      // request id); drop this stale page so it can't append to the new results.
      if (requestId !== requestIdRef.current) return
      setListings((prev) => [...prev, ...page.data])
      setCursor(page.page.nextCursor)
    } catch {
      // Keep what's already loaded; surface a soft error so the user can retry —
      // but not if a filter change already superseded this page.
      if (requestId === requestIdRef.current) setHasMoreError(true)
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
    const hasActiveFilter = Boolean(
      districtId || assetType || transactionType || priceMin || priceMax,
    )
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        {hasActiveFilter ? t("emptyFiltered") : t("empty")}
      </p>
    )
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
