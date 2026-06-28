import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CatalogHeader } from '@/components/catalog/catalog-header';
import { CatalogBrowser } from '@/components/catalog/catalog-browser';

type PageParams = { params: Promise<{ locale: string }> };

export default async function CatalogPage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  return (
    <div className="min-h-screen bg-background">
      <CatalogHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <CatalogBrowser />
      </main>
    </div>
  );
}
