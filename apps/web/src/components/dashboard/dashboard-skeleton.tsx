import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { PAGE_CONTAINER } from '@/lib/layout';

// Shared between the route-level loading.tsx (covers the brief RSC/hydration
// flash) and DashboardPage's own "loading" branch (covers the actual, longer
// getMe() wait — DashboardPage is a client component, so that's most of the
// real wait). Using the identical shape in both places means the header and
// layout never flicker out to a bare spinner and back in between the two.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div className={`${PAGE_CONTAINER} py-12 md:py-16`}>
        {/* welcome heading + subtitle */}
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />

        {/* Same two-column split as DashboardShell — wide working column, narrow
            rail — so the layout doesn't reflow when the real content lands. */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* listings section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            {/* saved section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:col-span-1">
            {/* account card */}
            <div className="rounded-xl border border-border">
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

            {/* seller verification / status card */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
