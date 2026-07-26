import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CatalogView } from '@/components/catalog/catalog-view';
import { SiteHeaderAuto } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

type PageParams = { params: Promise<{ locale: string }> };

export default async function CatalogPage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderAuto />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
