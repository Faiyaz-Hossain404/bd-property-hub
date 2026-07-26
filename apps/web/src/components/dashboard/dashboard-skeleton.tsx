import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

// Shared between the route-level loading.tsx (covers the brief RSC/hydration
// flash) and DashboardPage's own "loading" branch (covers the actual, longer
// getMe() wait — DashboardPage is a client component, so that's most of the
// real wait). Using the identical shape in both places means the header and
// layout never flicker out to a bare spinner and back in between the two.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        {/* welcome heading + subtitle */}
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />

        {/* account card */}
        <div className="mt-10 rounded-xl border border-border">
          <div className="space-y-2 border-b border-border px-6 py-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="divide-y divide-border/60 px-6">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* a content section (listings / saved) */}
        <div className="mt-10 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
