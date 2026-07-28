import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Inter, Hind_Siliguri } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Toaster } from 'sonner';
import { routing, type Locale } from '@/i18n/routing';
import { QueryProvider } from '@/providers/query-provider';
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
    // ClerkProvider supplies Clerk's auth context to the prebuilt <SignIn>/<SignUp>
    // widgets. It reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the env (loaded from the
    // root .env in next.config). URLs are locale-aware, and every successful sign-in/up
    // is forced to /complete, where we exchange the Clerk session for our own
    // bdph_session cookie. Colours match the app's honey-gold primary + radius.
    <ClerkProvider
      signInUrl={`/${locale}/login`}
      signUpUrl={`/${locale}/register`}
      signInForceRedirectUrl={`/${locale}/complete`}
      // ?welcome=1 is what tells /complete this arrival is a sign-UP rather than
      // a sign-in, so the one-time "buyer or seller?" step is offered to new
      // accounts only. It gates the prompt, never the role itself.
      signUpForceRedirectUrl={`/${locale}/complete?welcome=1`}
      appearance={{ variables: { colorPrimary: '#a16207', borderRadius: '0.625rem' } }}
    >
      <html lang={locale} className={`${latin.variable} ${bengali.variable}`}>
        <body>
          <NextIntlClientProvider messages={messages}>
            <QueryProvider>{children}</QueryProvider>
            {/* Mounted once at the root so any client component can call
                toast.*() without threading a provider through. richColors is
                what makes toast.error() read as an error rather than a neutral
                notice. */}
            <Toaster position="top-right" richColors closeButton />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
