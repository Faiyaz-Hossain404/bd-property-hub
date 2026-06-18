import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { DotPattern } from '@/components/ui/dot-pattern';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';

type PageParams = { params: Promise<{ locale: string }> };

// Numbers are data (8 divisions / 64 districts of Bangladesh), not copy — only
// the labels are translated.
const STATS = [
  { value: 64, suffix: '', labelKey: 'statDistrictsLabel', accent: 'text-clay' },
  { value: 100, suffix: '%', labelKey: 'statVerifiedLabel', accent: 'text-olive' },
  { value: 8, suffix: '', labelKey: 'statDivisionsLabel', accent: 'text-ochre' },
] as const;

export default async function HomePage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const nav = await getTranslations('nav');

  const otherLocale: Locale = locale === 'bn' ? 'en' : 'bn';
  const otherLabel = otherLocale === 'bn' ? 'বাংলা' : 'English';

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          {nav('brand')}
        </span>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" locale={otherLocale}>
              {otherLabel}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">{nav('signIn')}</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          {/* Decorative dotted texture; currentColor (text-olive) tints the dots. */}
          <DotPattern
            className={cn(
              'text-olive/25',
              'mask-[radial-gradient(560px_circle_at_center,white,transparent)]',
            )}
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
            <div>
              <div className="inline-flex items-center rounded-full border border-border bg-card/70 px-4 py-1.5 shadow-sm backdrop-blur">
                <AnimatedShinyText className="text-sm font-medium text-clay">
                  {t('badge')}
                </AnimatedShinyText>
              </div>

              <h1 className="mt-6 font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t('headline')} <span className="text-clay">{t('headlineAccent')}</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {t('subhead')}
              </p>

              <Card className="mt-8 flex max-w-xl flex-col gap-3 p-3 shadow-lg sm:flex-row sm:items-center">
                <Input
                  type="search"
                  placeholder={t('searchPlaceholder')}
                  aria-label={t('searchPlaceholder')}
                  className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                />
                <Button size="lg" className="h-12 shrink-0 px-8">
                  {t('searchCta')}
                </Button>
              </Card>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
              {STATS.map((stat) => (
                <Card key={stat.labelKey} className="gap-1 p-6">
                  <dt className={cn('font-heading text-3xl font-bold', stat.accent)}>
                    <NumberTicker value={stat.value} className={stat.accent} />
                    {stat.suffix}
                  </dt>
                  <dd className="text-sm text-muted-foreground">{t(stat.labelKey)}</dd>
                </Card>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </div>
  );
}
