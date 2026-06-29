import type { AssetType, ListingSort, TransactionType } from "@bdph/types"

// Catalog facets in their raw form — empty string means "no filter". Asset and
// transaction type are constrained to the known unions (plus ""); districtId is a
// 24-hex Zilla id (or ""); prices stay as the strings the user typed / the URL
// carries. CatalogBrowser parses prices to numbers when building the browse query.
// Shared so the filter bar, the URL (de)serialization, and the browser all agree
// on one shape.
export type CatalogFilterValue = {
  districtId: string
  assetType: AssetType | ""
  transactionType: TransactionType | ""
  priceMin: string
  priceMax: string
  // Sort order (DISC-2). Unlike the facets above, this applies immediately rather
  // than via the bar's Apply button. Always set; "newest" is the default.
  sort: ListingSort
}
