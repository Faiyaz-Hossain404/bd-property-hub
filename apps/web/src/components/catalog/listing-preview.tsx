"use client"

import { useLocale, useTranslations } from "next-intl"
import { ImageOff, MapPin, Search } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  attributeChips,
  coverPhoto,
  listingTitle,
  locationLabel,
  priceLabel,
} from "@/lib/listing-display"
import type { SavedListings } from "@/hooks/use-saved-listings"
import { SaveControl } from "./save-control"

type Props = {
  listing: PublicListing | null
  saved: SavedListings
  backQuery: string
}

// Right-rail quick preview of the selected listing (shown alongside the grid on
// wide screens). Shows only real data — cover, title, price, location, spec
// chips, save, and a link to the full detail page. No fabricated ratings or
// reviews; the full map and description live on the detail page.
export function ListingPreview({ listing, saved, backQuery }: Props) {
  const t = useTranslations("catalog")
  const locale = useLocale()

  if (!listing) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <Search className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">{t("previewEmpty")}</p>
      </div>
    )
  }

  const cover = coverPhoto(listing.media)
  const title = listingTitle(listing, locale)
  const place = locationLabel(listing.location, locale)
  const price = priceLabel(listing.pricing, locale, t)
  const chips = attributeChips(listing.attributes, locale, t)
  const href = backQuery ? `/catalog/${listing.id}?${backQuery}` : `/catalog/${listing.id}`

  return (
    <section
      aria-label={t("previewHeading")}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="relative aspect-4/3 bg-muted">
        {cover ? (
          <img
            src={cover.url}
            alt=""
            width={cover.width ?? 640}
            height={cover.height ?? 480}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" />
            <span className="text-xs">{t("noPhotos")}</span>
          </div>
        )}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="border border-border/60 bg-card/90 text-foreground shadow-sm backdrop-blur"
          >
            {t(`transactionTypes.${listing.transactionType}`)}
          </Badge>
          <Badge variant="outline" className="bg-card/85 backdrop-blur">
            {t(`assetTypes.${listing.assetType}`)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="line-clamp-2 font-heading text-lg leading-snug font-bold text-foreground">
            {title}
          </h2>
          <p className="mt-1.5 font-heading text-xl font-bold text-primary">{price}</p>
        </div>

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>{place ?? t("locationUnset")}</span>
        </p>

        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li
                key={chip.key}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {chip.label}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-1 flex items-center gap-2">
          <Button asChild size="sm" className="flex-1 rounded-full">
            <Link href={href}>{t("viewDetails")}</Link>
          </Button>
          <SaveControl listingId={listing.id} saved={saved} variant="button" className="shrink-0" />
        </div>

        {saved.error ? (
          <p role="alert" className="text-xs text-destructive">
            {saved.error}
          </p>
        ) : null}
      </div>
    </section>
  )
}
