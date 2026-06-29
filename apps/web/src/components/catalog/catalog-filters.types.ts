import type { AssetType, TransactionType } from "@bdph/types"

// Catalog facets in their raw form — empty string means "no filter". Asset and
// transaction type are constrained to the known unions (plus ""); prices stay as
// the strings the user typed / the URL carries. CatalogBrowser parses prices to
// numbers when building the browse query. Shared so the filter bar, the URL
// (de)serialization, and the browser all agree on one shape.
export type CatalogFilterValue = {
  assetType: AssetType | ""
  transactionType: TransactionType | ""
  priceMin: string
  priceMax: string
}
