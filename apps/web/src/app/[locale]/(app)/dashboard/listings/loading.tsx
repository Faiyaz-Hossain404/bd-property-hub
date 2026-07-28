import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { PAGE_CONTAINER } from '@/lib/layout';

// Route-level loading UI so the tab paints immediately on navigation instead of
// waiting on the RSC response.
//
// Deliberately NOT DashboardSkeleton: that one draws the dashboard's two-column
// shell, and reusing it here would mean the page visibly changes shape once the
// real page lands. This matches the listings layout — header, back link,
// heading, then the same card grid ListingsGrid falls back to while its query is
// in flight.
export default function MyListingsLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className={`${PAGE_CONTAINER} py-12 md:py-16`}>
        {/* back link */}
        <Skeleton className="h-4 w-40" />

        {/* title + subtitle */}
        <Skeleton className="mt-4 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
