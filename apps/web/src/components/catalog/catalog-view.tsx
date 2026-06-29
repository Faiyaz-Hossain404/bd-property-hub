"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"

import { ASSET_TYPES, TRANSACTION_TYPES, type AssetType, type TransactionType } from "@bdph/types"
import { usePathname, useRouter } from "@/i18n/navigation"
import { CatalogFilters } from "./catalog-filters"
import { CatalogBrowser } from "./catalog-browser"
import type { CatalogFilterValue } from "./catalog-filters.types"

// The URL is the single source of truth for the active facets (web rule:
// shareable filter state lives in the query string). This wrapper reads them via
// useSearchParams, feeds them to both the filter bar and the grid, and writes
// changes back with router.replace so applying a filter doesn't stack history
// entries. A whole-BDT digits-only guard keeps a hand-edited URL from producing a
// price the API would 400 on. Only known enum values survive parsing.
function parseFilters(params: URLSearchParams): CatalogFilterValue {
  const assetType = params.get("asset_type")
  const transactionType = params.get("transaction_type")
  const priceMin = params.get("price_min") ?? ""
  const priceMax = params.get("price_max") ?? ""
  const digits = /^\d+$/
  return {
    assetType: ASSET_TYPES.includes(assetType as AssetType) ? (assetType as AssetType) : "",
    transactionType: TRANSACTION_TYPES.includes(transactionType as TransactionType)
      ? (transactionType as TransactionType)
      : "",
    priceMin: digits.test(priceMin) ? priceMin : "",
    priceMax: digits.test(priceMax) ? priceMax : "",
  }
}

function toSearchString(filters: CatalogFilterValue): string {
  const next = new URLSearchParams()
  if (filters.assetType) next.set("asset_type", filters.assetType)
  if (filters.transactionType) next.set("transaction_type", filters.transactionType)
  if (filters.priceMin) next.set("price_min", filters.priceMin)
  if (filters.priceMax) next.set("price_max", filters.priceMax)
  return next.toString()
}

export function CatalogView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(new URLSearchParams(searchParams.toString()))

  const handleApply = useCallback(
    (next: CatalogFilterValue) => {
      const query = toSearchString(next)
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [router, pathname],
  )

  return (
    <>
      <CatalogFilters value={filters} onApply={handleApply} />
      <CatalogBrowser filters={filters} />
    </>
  )
}
