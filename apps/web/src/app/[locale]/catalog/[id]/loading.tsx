import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { ListingDetailSkeleton } from '@/components/catalog/listing-detail-skeleton';
import { PAGE_CONTAINER } from '@/lib/layout';

// Route-level loading UI for a listing detail page — the brief RSC/hydration
// flash. ListingDetail's own "loading" branch (the actual, longer wait for its
// client-side getPublicListing() fetch) renders the same ListingDetailSkeleton,
// so the content area hands off without a shape change. See listing-detail-skeleton.tsx.
export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderSkeleton />
      <main className={`${PAGE_CONTAINER} py-10`}>
        <ListingDetailSkeleton />
      </main>
    </div>
  );
}
