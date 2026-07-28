import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CatalogView } from '@/components/catalog/catalog-view';
import { SiteHeaderAuto } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PAGE_CONTAINER } from '@/lib/layout';

type PageParams = { params: Promise<{ locale: string }> };

export default async function CatalogPage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  return (
    // flex column + flex-1 on <main> keeps the footer flush to the bottom when
    // the grid is short or empty (a filter that matches nothing) instead of
    // leaving blank background under it.
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderAuto />
      <main className={`${PAGE_CONTAINER} flex-1 py-10`}>
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Suspense>
          <CatalogView />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
