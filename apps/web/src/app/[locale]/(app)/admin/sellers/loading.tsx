import { AdminListSkeleton } from '@/components/admin/admin-list-skeleton';

// Route-level loading UI for /admin/sellers. SellerVerificationQueue is a
// single Card of divided rows — a different shape from admin/loading.tsx's
// stat-card overview, which would otherwise be the fallback here.
export default function AdminSellersLoading() {
  return <AdminListSkeleton cardCount={1} rowsPerCard={4} />;
}
