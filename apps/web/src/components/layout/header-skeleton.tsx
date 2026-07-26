import { Skeleton } from '@/components/ui/skeleton';

// Stand-in for the public sticky header (SiteHeaderAuto) while a route loads.
// The real header is rendered *inside* each public page (home, catalog, listing
// detail), so the route-level loading screen has to reserve its space too or the
// layout jumps when the page swaps in. Mirrors the real bar: sticky glass strip,
// brand left, centered nav (md+), locale + avatar right.
export function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-50 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-32 rounded-lg" />
        <div className="hidden items-center gap-2 md:flex">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* HeaderSearch (hidden below lg) */}
          <Skeleton className="hidden h-9 w-56 rounded-md lg:block" />
          <Skeleton className="h-8 w-10 rounded-md" />
          <div className="flex items-center gap-2 rounded-full p-1 lg:pr-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            {/* UserMenu's name/email text (hidden below lg) */}
            <div className="hidden flex-col gap-1 lg:flex">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
