"use client"

import { useCallback, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { SlidersHorizontal } from "lucide-react"

import {
  ASSET_TYPES,
  LISTING_SORTS,
  TRANSACTION_TYPES,
  type AssetType,
  type ListingSort,
  type TransactionType,
} from "@bdph/types"
import { usePathname, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CatalogFilters } from "./catalog-filters"
import { CatalogBrowser } from "./catalog-browser"
import type { CatalogFilterValue } from "./catalog-filters.types"

// The URL is the single source of truth for the active facets and sort (web rule:
// shareable state lives in the query string). This wrapper reads them via
// useSearchParams, feeds them to the filter bar, the sort control, and the grid,
// and writes changes back with router.replace so applying a filter doesn't stack
// history entries. A whole-BDT digits-only guard keeps a hand-edited URL from
// producing a price the API would 400 on; only known enum values survive parsing.
// Mirror of the server's q cap (publicListingQuerySchema) so a hand-edited URL
// can't push a longer term than the API would accept.
const MAX_SEARCH_LENGTH = 80

function parseFilters(params: URLSearchParams): CatalogFilterValue {
  const q = (params.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH)
  const districtId = params.get("district_id") ?? ""
  const cityUpazilaId = params.get("city_upazila_id") ?? ""
  const assetType = params.get("asset_type")
  const transactionType = params.get("transaction_type")
  const priceMin = params.get("price_min") ?? ""
  const priceMax = params.get("price_max") ?? ""
  const sort = params.get("sort")
  const digits = /^\d+$/
  const hex24 = /^[a-f0-9]{24}$/i
  const validDistrict = hex24.test(districtId) ? districtId : ""
  return {
    q,
    districtId: validDistrict,
    // A drill-down only makes sense under a district — drop it if the district is
    // missing/invalid so the pair can't disagree.
    cityUpazilaId: validDistrict && hex24.test(cityUpazilaId) ? cityUpazilaId : "",
    assetType: ASSET_TYPES.includes(assetType as AssetType) ? (assetType as AssetType) : "",
    transactionType: TRANSACTION_TYPES.includes(transactionType as TransactionType)
      ? (transactionType as TransactionType)
      : "",
    priceMin: digits.test(priceMin) ? priceMin : "",
    priceMax: digits.test(priceMax) ? priceMax : "",
    sort: LISTING_SORTS.includes(sort as ListingSort) ? (sort as ListingSort) : "newest",
  }
}

function toSearchString(filters: CatalogFilterValue): string {
  const next = new URLSearchParams()
  if (filters.q) next.set("q", filters.q)
  if (filters.districtId) next.set("district_id", filters.districtId)
  // Only meaningful alongside a district (parseFilters drops an orphan anyway).
  if (filters.districtId && filters.cityUpazilaId) {
    next.set("city_upazila_id", filters.cityUpazilaId)
  }
  if (filters.assetType) next.set("asset_type", filters.assetType)
  if (filters.transactionType) next.set("transaction_type", filters.transactionType)
  if (filters.priceMin) next.set("price_min", filters.priceMin)
  if (filters.priceMax) next.set("price_max", filters.priceMax)
  // "newest" is the default — leave it out to keep the URL clean.
  if (filters.sort !== "newest") next.set("sort", filters.sort)
  return next.toString()
}

export function CatalogView() {
  const t = useTranslations("catalog")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(new URLSearchParams(searchParams.toString()))
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const applyFilters = useCallback(
    (next: CatalogFilterValue) => {
      const query = toSearchString(next)
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [router, pathname],
  )

  // Sort applies immediately (it's not behind the bar's Apply button), carrying
  // the currently-committed facets along.
  function handleSortChange(sort: ListingSort) {
    applyFilters({ ...filters, sort })
  }

  return (
    // Flex rather than a grid template: the sidebar takes a fixed 20rem and the
    // results column absorbs everything left over. `min-w-0` on that column is
    // load-bearing — a flex item defaults to min-width:auto, so without it the
    // card grid would refuse to shrink below its content and push the row wider
    // than the container.
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Desktop rail. `top-20` clears the 4rem sticky header with a 1rem gap;
          the height cap plus its own scroll keeps a long filter list from
          running past the fold, which is what a sticky element would otherwise
          do (sticky doesn't shrink to the viewport, it just stops moving).
          Hidden rather than unmounted below `lg` so there's no layout swap on
          hydration — the drawer below renders the same form. */}
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain">
        <CatalogFilters value={filters} onApply={applyFilters} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Below `lg` the rail is gone, so the same filters open in a drawer.
              Applying commits the query and closes it, so the results are
              visible immediately instead of behind the scrim. */}
          <Sheet open={isFilterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="size-4" />
                {t("filters.title")}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" aria-describedby={undefined} className="overflow-y-auto p-4">
              <SheetHeader className="p-0">
                <SheetTitle>{t("filters.title")}</SheetTitle>
              </SheetHeader>
              <CatalogFilters
                value={filters}
                onApply={(next) => {
                  applyFilters(next)
                  setFilterDrawerOpen(false)
                }}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </SheetContent>
          </Sheet>

          <div className="ms-auto flex items-center gap-2">
            <Label htmlFor="catalog-sort" className="text-muted-foreground">
              {t("sort.label")}
            </Label>
            <Select
              value={filters.sort}
              onValueChange={(next) => handleSortChange(next as ListingSort)}
            >
              <SelectTrigger id="catalog-sort" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LISTING_SORTS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`sort.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CatalogBrowser filters={filters} />
      </div>
    </div>
  )
}
