import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

// Route-level loading UI for the dashboard — the brief RSC/hydration flash.
// DashboardPage's own "loading" branch (the actual, longer wait for its
// client-side session check) renders the same DashboardSkeleton, so the two
// hand off without a shape change. See dashboard-skeleton.tsx.
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
