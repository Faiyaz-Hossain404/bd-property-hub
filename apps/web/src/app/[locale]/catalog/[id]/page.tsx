import { setRequestLocale } from 'next-intl/server';

import { ListingDetail } from '@/components/catalog/listing-detail';
import { SiteHeaderAuto } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PAGE_CONTAINER } from '@/lib/layout';

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
  // params and searchParams are independent promises, so they're awaited
  // together. Awaiting them in sequence made the page wait out the slower one
  // *after* the faster one had already resolved, for no reason — nothing here
  // reads params to build searchParams or vice versa.
  const [{ locale, id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const backQuery = buildBackQuery(resolvedSearchParams);

  return (
    // flex column + flex-1 on <main> keeps the footer flush to the bottom on
    // short pages (a not-found or single-photo listing) instead of leaving blank
    // background under it.
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderAuto />
      <main className={`${PAGE_CONTAINER} flex-1 py-10`}>
        <ListingDetail id={id} backQuery={backQuery} />
      </main>

      <SiteFooter />
    </div>
  );
}
