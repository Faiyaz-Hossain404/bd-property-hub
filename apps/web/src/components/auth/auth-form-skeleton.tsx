import { Skeleton } from '@/components/ui/skeleton';

// The auth card's placeholder shape, shared by the two places that stand in for
// a not-yet-present Clerk form: the route-level (auth)/loading.tsx, and the
// mount gate inside SignInForm/SignUpForm. Using one shape in both means the
// card never flickers between them as a navigation hands off to hydration.
//
// It also reserves the card's height, so Clerk mounting on the second client
// render swaps into the same box instead of shifting the page.
export function AuthFormSkeleton() {
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
