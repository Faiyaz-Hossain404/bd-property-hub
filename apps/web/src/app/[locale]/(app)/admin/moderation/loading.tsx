import { AdminListSkeleton } from '@/components/admin/admin-list-skeleton';

// Route-level loading UI for /admin/moderation. ModerationSection renders TWO
// stacked Cards (the moderation queue, then removed listings) — a different
// shape from admin/loading.tsx's stat-card overview, which would otherwise be
// the fallback here.
export default function AdminModerationLoading() {
  return <AdminListSkeleton cardCount={2} rowsPerCard={3} />;
}
