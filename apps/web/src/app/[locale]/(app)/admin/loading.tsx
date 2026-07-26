import { Skeleton } from '@/components/ui/skeleton';

// Route-level loading UI for the admin area. This renders *inside* the persistent
// AdminShell (the /admin layout keeps the header + sidebar mounted), so it's the
// inner overview content only — no header placeholder. Mirrors OverviewPanel's
// root: heading, the 6-up headline totals, and the trend chart cards. Also backs
// the admin sub-routes (users / sellers / moderation) that lack their own loader.
export default function AdminLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      {/* heading */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* headline totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, cardIndex) => (
          <div key={cardIndex} className="space-y-3 rounded-xl border border-border p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* trend charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, chartIndex) => (
          <div key={chartIndex} className="rounded-xl border border-border">
            <div className="border-b border-border px-6 py-5">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="px-4 py-5">
              <Skeleton className="h-[240px] w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
