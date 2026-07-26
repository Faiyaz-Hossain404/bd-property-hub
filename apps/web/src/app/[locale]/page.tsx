import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { DotPattern } from '@/components/ui/dot-pattern';
import { NumberTicker } from '@/components/ui/number-ticker';
import BlurText from '@/components/ui/BlurText';
import { HeroSearch } from '@/components/home/hero-search';
import { SiteHeaderAuto } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

type PageParams = { params: Promise<{ locale: string }> };

// Numbers are data (8 divisions / 64 districts of Bangladesh), not copy — only
// the labels are translated.
const STATS = [
  { value: 64, suffix: '', labelKey: 'statDistrictsLabel', accent: 'text-clay' },
  { value: 100, suffix: '%', labelKey: 'statVerifiedLabel', accent: 'text-olive' },
  { value: 8, suffix: '', labelKey: 'statDivisionsLabel', accent: 'text-ochre' },
] as const;

// Hero blur-in. Opacity stays at 1 and only blur + a small rise animate, so the
// LCP heading (and the badge/subhead above and below it) are painted — and
// legible without JS — from the first frame rather than hidden at opacity:0
// until hydration. Shared by all three hero text elements.
const HERO_BLUR_FROM = { filter: 'blur(12px)', opacity: 1, y: -12 };
const HERO_BLUR_TO = [
  { filter: 'blur(6px)', opacity: 1, y: 0 },
  { filter: 'blur(0px)', opacity: 1, y: 0 },
];

export default async function HomePage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderAuto />

      <main>
        <section className="relative overflow-hidden">
          {/* Decorative dotted texture; currentColor (text-olive) tints the dots. */}
          <DotPattern
            className={cn(
              'text-olive/20',
              'mask-[radial-gradient(560px_circle_at_center,white,transparent)]',
            )}
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-28 lg:px-8">
            <div>
              {/* Clean inline badge text — no pill/box. Starts the hero cascade. */}
              <BlurText
                as="span"
                text={t('badge')}
                className="text-sm font-medium text-clay"
                animateBy="words"
                delay={100}
                stepDuration={0.25}
                immediate
                animationFrom={HERO_BLUR_FROM}
                animationTo={HERO_BLUR_TO}
              />

              {/* Animated blur-in hero heading. The h1 keeps a plain aria-label
                  (the real text) for a clean screen-reader announcement and SEO,
                  while the two BlurText spans (aria-hidden) carry the visual
                  animation — the second keeps the honey-gold accent. Starts
                  slightly after the badge (startDelay) so the two read as one
                  cascade rather than firing together. */}
              <h1
                className="mt-6 font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                aria-label={`${t('headline')} ${t('headlineAccent')}`}
              >
                <BlurText
                  as="span"
                  text={t('headline')}
                  animateBy="words"
                  delay={120}
                  startDelay={150}
                  immediate
                  animationFrom={HERO_BLUR_FROM}
                  animationTo={HERO_BLUR_TO}
                  aria-hidden
                />{' '}
                <BlurText
                  as="span"
                  text={t('headlineAccent')}
                  className="text-clay"
                  animateBy="words"
                  delay={120}
                  startDelay={150}
                  immediate
                  // Same split(' ') BlurText uses internally to build word
                  // spans, so this offset can't drift out of sync with the
                  // actually-rendered word count.
                  startIndex={t('headline').split(' ').length}
                  animationFrom={HERO_BLUR_FROM}
                  animationTo={HERO_BLUR_TO}
                  aria-hidden
                />
              </h1>

              {/* Starts after the heading's cascade begins (startDelay). */}
              <BlurText
                as="p"
                text={t('subhead')}
                className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
                animateBy="words"
                delay={80}
                stepDuration={0.2}
                startDelay={350}
                immediate
                animationFrom={HERO_BLUR_FROM}
                animationTo={HERO_BLUR_TO}
              />

              <HeroSearch />
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

      <SiteFooter />
    </div>
  );
}
