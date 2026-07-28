import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { PAGE_CONTAINER } from '@/lib/layout';

// Route-level loading UI for the drafts page, so the tab paints immediately on
// navigation instead of waiting on the RSC response.
//
// Deliberately NOT DashboardSkeleton: that one draws the dashboard's two-column
// shell, and reusing it here would mean the page visibly changes shape once the
// real drafts page (a heading plus a card grid) lands. This matches the drafts
// layout — header, back link, heading, then the same three-card grid DraftsGrid
// falls back to while its query is in flight.
export default function DraftsLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className={`${PAGE_CONTAINER} py-12 md:py-16`}>
        {/* back link */}
        <Skeleton className="h-4 w-40" />

        {/* title + subtitle */}
        <Skeleton className="mt-4 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
