import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Inter, Hind_Siliguri } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import '../globals.css';

const latin = Inter({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
const bengali = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
});

type LocaleParams = { params: Promise<{ locale: string }> };

// Pre-render a static shell per locale.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  // Required for next-intl static rendering of this segment.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    // ClerkProvider supplies the auth context the headless sign-in/up hooks use.
    // It reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the env (loaded from the root
    // .env in next.config). Wraps the whole document so the hooks work everywhere.
    <ClerkProvider>
      <html lang={locale} className={`${latin.variable} ${bengali.variable}`}>
        <body>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
