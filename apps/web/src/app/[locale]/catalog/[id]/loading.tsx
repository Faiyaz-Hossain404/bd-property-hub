import { HeaderSkeleton } from '@/components/layout/header-skeleton';
import { ListingDetailSkeleton } from '@/components/catalog/listing-detail-skeleton';

// Route-level loading UI for a listing detail page — the brief RSC/hydration
// flash. ListingDetail's own "loading" branch (the actual, longer wait for its
// client-side getPublicListing() fetch) renders the same ListingDetailSkeleton,
// so the content area hands off without a shape change. See listing-detail-skeleton.tsx.
export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderSkeleton />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ListingDetailSkeleton />
      </main>
    </div>
  );
}
