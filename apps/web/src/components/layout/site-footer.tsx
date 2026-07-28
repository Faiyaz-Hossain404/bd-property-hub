"use client"

import { Building2, Mail, Phone } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL, CONTACT_PHONES } from "@/lib/contact"
import { PAGE_CONTAINER } from "@/lib/layout"

// Site-wide marketing footer for the public surfaces (home, catalog, listing
// detail). Deep-charcoal ground, white headings, muted-gray links, and a
// honey-gold call-to-action. Only links to routes that actually exist (Home,
// Listings) — no placeholder legal pages and no fabricated content.
export function SiteFooter() {
  const t = useTranslations("footer")
  const tNav = useTranslations("nav")
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-stone-950 text-stone-400">
      {/* Kept deliberately slim — this is a marketing footer under a long
          scrolling catalog, not a destination of its own, so it takes the least
          vertical space that still reads as separate sections. */}
      <div className={`${PAGE_CONTAINER} py-8`}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:gap-8">
          {/* Brand + tagline */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Building2 className="size-4.5" />
              </span>
              <span className="font-heading text-base font-bold tracking-tight text-white">
                {tNav("brand")}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">{t("tagline")}</p>
          </div>

          {/* Explore column — real routes only */}
          <nav aria-label={t("exploreHeading")} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              {t("exploreHeading")}
            </h2>
            <Link href="/" className="text-sm text-stone-400 transition-colors hover:text-white">
              {tNav("home")}
            </Link>
            <Link
              href="/catalog"
              className="text-sm text-stone-400 transition-colors hover:text-white"
            >
              {tNav("listings")}
            </Link>
          </nav>

          {/* Get started column + honey-gold CTA */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              {t("getStartedHeading")}
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-stone-400">{t("getStartedBlurb")}</p>
            <Button asChild size="sm" className="mt-1 w-fit rounded-full">
              <Link href="/catalog">{t("browseCta")}</Link>
            </Button>
          </div>

          {/* Contact column — email plus the two voice lines, each icon-prefixed
              so the block reads as one list rather than a bare link stack. The
              icons are decorative: the link text already says what each one is,
              so they stay aria-hidden instead of doubling the announcement. */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              {t("contactHeading")}
            </h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-start gap-2 text-sm text-stone-400 transition-colors hover:text-white"
            >
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="wrap-break-word">{CONTACT_EMAIL}</span>
            </a>
            {CONTACT_PHONES.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white"
              >
                <Phone className="size-4 shrink-0" aria-hidden />
                <span>{phone}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-7 border-t border-white/10 pt-5">
          <p className="text-xs text-stone-400">
            © <span suppressHydrationWarning>{year}</span> {tNav("brand")}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  )
}
