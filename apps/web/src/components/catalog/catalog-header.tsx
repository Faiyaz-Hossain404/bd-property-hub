"use client"

import { useLocale, useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"

// Public site header for the catalog surface. The language toggle preserves the
// current route (usePathname is locale-agnostic in next-intl), so switching
// language on a listing detail page keeps you on that listing.
export function CatalogHeader() {
  const nav = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale: Locale = locale === "bn" ? "en" : "bn"
  const otherLabel = otherLocale === "bn" ? "বাংলা" : "English"

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight text-foreground"
        >
          {nav("brand")}
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-medium sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/catalog">{nav("browse")}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={pathname} locale={otherLocale}>
              {otherLabel}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">{nav("signIn")}</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
