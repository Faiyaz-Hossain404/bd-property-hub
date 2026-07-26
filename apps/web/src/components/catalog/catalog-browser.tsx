"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import { useListings } from "@/hooks/use-listings"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useSavedListings } from "@/hooks/use-saved-listings"
import { Button } from "@/components/ui/button"
import { ListingCard } from "./listing-card"
import { ListingPreview } from "./listing-preview"
import type { CatalogFilterValue } from "./catalog-filters.types"

// The preview rail (and the click-to-preview behaviour) only turn on once there's
// room for a third column.
const RAIL_QUERY = "(min-width: 1280px)"

// Client-side, cursor-paginated catalog with a live preview rail. Fetches page 1
// on mount (via useListings/useInfiniteQuery) and reloads it whenever the active
// filters change. A stale `selectedId` from the previous search self-corrects:
// `selected` below falls back to the first result when the id isn't in the new
// list, so no remount/key is needed to reset the preview (a key would tear down
// useSavedListings mid-save and force a redundant saved-ids refetch). TanStack
// Query caches per distinct `filters` value, so re-applying a filter combo
// already seen this session (e.g. the back button) renders instantly from cache
// instead of re-fetching.
export function CatalogBrowser({ filters }: { filters: CatalogFilterValue }) {
  const t = useTranslations("catalog")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const saved = useSavedListings()
  const railActive = useMediaQuery(RAIL_QUERY)
  const catalogQuery = useSearchParams().toString()

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useListings(filters)

  const listings = data?.pages.flatMap((page) => page.data) ?? []
  // A failed *next*-page fetch keeps every already-loaded page in `data` — only
  // an initial-load failure (no pages ever landed) should replace the whole view.
  const initialLoadFailed = isError && !data
  const loadMoreFailed = isError && Boolean(data)

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
        <p className="mt-3 text-sm">{t("loading")}</p>
      </div>
    )
  }

  if (initialLoadFailed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-destructive">{t("loadError")}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
          {t("retry")}
        </Button>
      </div>
    )
  }

  if (listings.length === 0) {
    const hasActiveFilter = Boolean(
      filters.q ||
        filters.districtId ||
        filters.cityUpazilaId ||
        filters.assetType ||
        filters.transactionType ||
        filters.priceMin ||
        filters.priceMax,
    )
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        {hasActiveFilter ? t("emptyFiltered") : t("empty")}
      </p>
    )
  }

  const selected = listings.find((listing) => listing.id === selectedId) ?? listings[0] ?? null

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              saved={saved}
              active={railActive && listing.id === selected?.id}
              selectable={railActive}
              onSelect={(next) => setSelectedId(next.id)}
            />
          ))}
        </div>
        {hasNextPage ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            {loadMoreFailed ? <p className="text-sm text-destructive">{t("loadError")}</p> : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
            </Button>
          </div>
        ) : null}
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <ListingPreview listing={selected} saved={saved} backQuery={catalogQuery} />
        </div>
      </aside>
    </div>
  )
}
