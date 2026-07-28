import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { PAGE_CONTAINER } from '@/lib/layout';

// Route-level loading UI for the home page (the [locale] segment's own page).
// Mirrors the hero: badge → heading → subhead on the left, stat cards on the
// right, so nothing shifts when the real content arrives. This boundary also
// backs any [locale] child route that lacks its own loading.tsx — every dynamic
// child (catalog, dashboard, admin, auth) has one, so this stays home-shaped.
// aria-busy marks the region as loading; Next.js's route announcer reads the real
// (localized) page title once it lands, so no placeholder copy is needed here.
export default function HomeLoading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-background">
      <HeaderSkeleton />

      <div
        className={`${PAGE_CONTAINER} grid items-center gap-12 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28`}
      >
        <div>
          {/* badge */}
          <Skeleton className="h-5 w-56" />
          {/* heading (two lines of the responsive h1) */}
          <div className="mt-6 space-y-3">
            <Skeleton className="h-11 w-full max-w-md" />
            <Skeleton className="h-11 w-4/5 max-w-sm" />
          </div>
          {/* subhead */}
          <div className="mt-5 max-w-xl space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* stat cards */}
        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
