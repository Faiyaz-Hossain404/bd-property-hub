import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

// Route-level loading UI for a listing detail page. Mirrors the two-column
// layout: gallery (hero image + thumbnail strip) on the left, the listing facts
// (title, price, spec chips, description, map) on the right.
export default function ListingDetailLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* back to browse */}
        <Skeleton className="h-4 w-28" />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {/* gallery */}
          <div className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, thumbIndex) => (
                <Skeleton key={thumbIndex} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>

          {/* facts */}
          <div className="space-y-5">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-7 w-40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, chipIndex) => (
                <Skeleton key={chipIndex} className="h-7 w-20 rounded-full" />
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
