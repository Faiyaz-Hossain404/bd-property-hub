import { setRequestLocale } from 'next-intl/server';

import { ListingDetail } from '@/components/catalog/listing-detail';
import { SiteHeaderAuto } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

type SearchParams = Record<string, string | string[] | undefined>;

type PageParams = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<SearchParams>;
};

// The catalog facets we round-trip so "back to browse" restores the buyer's
// search. Whitelisted (not echoed wholesale) so stray params can't ride along.
const CATALOG_PARAM_KEYS = [
  'q',
  'district_id',
  'asset_type',
  'transaction_type',
  'price_min',
  'price_max',
  'sort',
] as const;

function buildBackQuery(params: SearchParams): string {
  const search = new URLSearchParams();
  for (const key of CATALOG_PARAM_KEYS) {
    const value = params[key];
    if (typeof value === 'string' && value.length > 0) search.set(key, value);
  }
  return search.toString();
}

export default async function ListingDetailPage({ params, searchParams }: PageParams) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const backQuery = buildBackQuery(await searchParams);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderAuto />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ListingDetail id={id} backQuery={backQuery} />
      </main>

      <SiteFooter />
    </div>
  );
}
