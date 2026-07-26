import { Skeleton } from '@/components/ui/skeleton';

// Shared between the route-level loading.tsx (the brief RSC/hydration flash) and
// ListingDetail's own "loading" branch (the actual getPublicListing() wait —
// ListingDetail is a client component, so that's most of the real wait). Using
// the identical shape in both places means the content area doesn't flicker out
// to a bare centered spinner and back in between the two. Mirrors ListingDetail's
// real structure: back link, then a 1.4fr/1fr grid (gallery · facts), then the
// description and map full-width BELOW the grid (not nested in the facts column).
export function ListingDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      {/* back to browse */}
      <Skeleton className="h-4 w-28" />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        {/* gallery: 4/3 hero + 5-up thumbnail strip (matches ListingGallery) */}
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, thumbIndex) => (
              <Skeleton key={thumbIndex} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* facts column: badges, title, price, save, location, detail chips */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-4 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, chipIndex) => (
                <Skeleton key={chipIndex} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* description — full width below the grid */}
      <div className="max-w-3xl space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* approximate-location map — full width below the grid */}
      <div className="max-w-3xl space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
