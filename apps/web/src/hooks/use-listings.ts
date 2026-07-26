import { useInfiniteQuery } from '@tanstack/react-query';

import {
  ASSET_TYPES,
  TRANSACTION_TYPES,
  type AssetType,
  type ListingSort,
  type TransactionType,
} from '@bdph/types';
import { browseListings } from '@/lib/api';
import type { CatalogFilterValue } from '@/components/catalog/catalog-filters.types';

// Mirrors the server's q cap (publicListingQuerySchema) so a hand-edited URL
// can't push a longer term than the API would accept.
const MAX_SEARCH_LENGTH = 80;

function toBrowseParams(filters: CatalogFilterValue) {
  return {
    q: filters.q.trim().slice(0, MAX_SEARCH_LENGTH) || null,
    districtId: filters.districtId || null,
    cityUpazilaId: filters.cityUpazilaId || null,
    assetType: ASSET_TYPES.includes(filters.assetType as AssetType)
      ? (filters.assetType as AssetType)
      : null,
    transactionType: TRANSACTION_TYPES.includes(filters.transactionType as TransactionType)
      ? (filters.transactionType as TransactionType)
      : null,
    priceMin: filters.priceMin.trim() ? Number(filters.priceMin) : null,
    priceMax: filters.priceMax.trim() ? Number(filters.priceMax) : null,
    sort: filters.sort as ListingSort | null,
  };
}

// Public, cursor-paginated catalog browse. Caches per distinct `filters` value,
// so navigating away and back (or re-applying a filter combo already seen this
// session) renders from cache instantly instead of re-fetching. Replaces the
// old manual accumulate-pages + request-id-guard dance in CatalogBrowser —
// TanStack Query already dedupes/cancels stale requests per query key.
export function useListings(filters: CatalogFilterValue) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: ({ pageParam }) => browseListings({ cursor: pageParam, ...toBrowseParams(filters) }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.page.nextCursor ?? undefined,
  });
}
