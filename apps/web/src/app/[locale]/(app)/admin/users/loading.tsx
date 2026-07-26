import { AdminListSkeleton } from '@/components/admin/admin-list-skeleton';

// Route-level loading UI for /admin/users. UsersPanel is a search+filter row
// above one Card of divided user rows — a different shape from admin/loading.tsx's
// stat-card overview, which would otherwise be the fallback here.
export default function AdminUsersLoading() {
  return <AdminListSkeleton withFilters cardCount={1} rowsPerCard={5} />;
}
