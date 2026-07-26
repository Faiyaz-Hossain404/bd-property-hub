import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

// One placeholder property card: cover image + two text bars, matching the
// full-bleed ListingCard footprint in the grid.
function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// Route-level loading UI for the catalog ("Listings") page. Mirrors the 3-column
// dashboard: filter sidebar · sort row + card grid · sticky preview rail (xl+).
export default function CatalogLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* page title */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          {/* filter sidebar */}
          <aside className="space-y-6 rounded-xl border border-border p-5">
            {Array.from({ length: 3 }).map((_, groupIndex) => (
              <div key={groupIndex} className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-md" />
          </aside>

          {/* sort row + card grid + preview rail */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
            <div>
              <div className="mb-5 flex items-center justify-end gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-40 rounded-md" />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, cardIndex) => (
                  <ListingCardSkeleton key={cardIndex} />
                ))}
              </div>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-24 space-y-3 rounded-xl border border-border p-4">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
