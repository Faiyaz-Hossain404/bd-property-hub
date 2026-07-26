import { Skeleton } from '@/components/ui/skeleton';

function ListCard({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-border">
      <div className="space-y-2 border-b border-border px-6 py-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="divide-y divide-border/60 px-6">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-between gap-3 py-4">
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared shape for the admin sub-routes that are a heading + one or more
// "Card with divided rows" lists (users / sellers / moderation) — as opposed
// to admin/loading.tsx's overview shape (stat cards + charts), which does not
// match these routes. `withFilters` reserves the search+select row the users
// list has; `cardCount`/`rowsPerCard` size the list block(s) (moderation
// renders two stacked cards: the queue and the removed-listings list).
export function AdminListSkeleton({
  withFilters = false,
  cardCount = 1,
  rowsPerCard = 4,
}: {
  withFilters?: boolean;
  cardCount?: number;
  rowsPerCard?: number;
}) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {withFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      ) : null}

      <div className="space-y-6">
        {Array.from({ length: cardCount }).map((_, cardIndex) => (
          <ListCard key={cardIndex} rows={rowsPerCard} />
        ))}
      </div>
    </div>
  );
}
