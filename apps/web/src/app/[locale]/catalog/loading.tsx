import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { PAGE_CONTAINER } from '@/lib/layout';

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

// Route-level loading UI for the catalog ("Listings") page. Mirrors the real
// layout: fixed filter sidebar on the left, sort row + 3-column card grid on the
// right, in the shared page container — so nothing shifts when content lands.
export default function CatalogLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className={`${PAGE_CONTAINER} py-10`}>
        {/* page title */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* filter sidebar — same 20rem fixed column as CatalogView */}
          <aside className="w-full space-y-6 rounded-xl border border-border p-5 lg:w-80 lg:shrink-0">
            {Array.from({ length: 3 }).map((_, groupIndex) => (
              <div key={groupIndex} className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-md" />
          </aside>

          {/* sort row + card grid */}
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-end gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-40 rounded-md" />
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, cardIndex) => (
                <ListingCardSkeleton key={cardIndex} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
