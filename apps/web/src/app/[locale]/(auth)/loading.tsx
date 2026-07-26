import { Skeleton } from '@/components/ui/skeleton';

// Route-level loading UI for the auth pages. The (auth) layout already renders the
// minimal header + a centered <main>, so this only stands in for the auth card
// itself. Its main job is to keep the home skeleton (the parent [locale] boundary)
// from bleeding onto /login, /register, etc. during navigation.
export default function AuthLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8"
    >
      {/* title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* fields */}
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, fieldIndex) => (
          <div key={fieldIndex} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* submit */}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
