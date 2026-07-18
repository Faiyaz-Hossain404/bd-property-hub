"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import {
  ASSET_TYPES,
  LISTING_SORTS,
  TRANSACTION_TYPES,
  type AssetType,
  type ListingSort,
  type TransactionType,
} from "@bdph/types"
import { usePathname, useRouter } from "@/i18n/navigation"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <>
      <CatalogFilters value={filters} onApply={applyFilters} />
      <div className="mb-5 flex items-center justify-end gap-2">
        <Label htmlFor="catalog-sort" className="text-muted-foreground">
          {t("sort.label")}
        </Label>
        <Select value={filters.sort} onValueChange={(next) => handleSortChange(next as ListingSort)}>
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
      <CatalogBrowser filters={filters} />
    </>
  )
}
