import { setRequestLocale } from 'next-intl/server';

import { CatalogHeader } from '@/components/catalog/catalog-header';
import { ListingDetail } from '@/components/catalog/listing-detail';

type PageParams = { params: Promise<{ locale: string; id: string }> };

export default async function ListingDetailPage({ params }: PageParams) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-background">
      <CatalogHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <ListingDetail id={id} />
      </main>
    </div>
  );
}
