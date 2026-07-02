"use client"

import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { ImageOff } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { coverPhoto, listingTitle, locationLabel, priceLabel } from "@/lib/listing-display"

type Props = { listing: PublicListing }

// One catalog grid card. Plain <img> (not next/image) keeps Cloudinary delivery
// URLs working without remote-host config — the URLs already carry f_auto,q_auto.
export function ListingCard({ listing }: Props) {
  const t = useTranslations("catalog")
  const locale = useLocale()
  const cover = coverPhoto(listing.media)
  const title = listingTitle(listing, locale)
  const place = locationLabel(listing.location, locale)
  const price = priceLabel(listing.pricing, locale, t)

  // Carry the active catalog query onto the detail link so the detail page's
  // "back to browse" can return the buyer to the same search/filters/sort (and
  // so a shared detail link keeps that context). The detail page ignores these
  // params for loading — it keys off the route id.
  const catalogQuery = useSearchParams().toString()
  const href = catalogQuery ? `/catalog/${listing.id}?${catalogQuery}` : `/catalog/${listing.id}`

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover.url}
            alt=""
            width={cover.width ?? 640}
            height={cover.height ?? 480}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" />
            <span className="text-xs">{t("noPhotos")}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{t(`transactionTypes.${listing.transactionType}`)}</Badge>
          {listing.isGroupPurchase ? (
            <Badge variant="outline" className="bg-background/80 backdrop-blur">
              {t("groupPurchase")}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="line-clamp-2 font-heading text-base leading-snug font-semibold text-foreground">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(`assetTypes.${listing.assetType}`)}
          {place ? ` · ${place}` : ""}
        </p>
        <p className="mt-auto pt-2 font-heading text-lg font-bold text-clay">{price}</p>
      </div>
    </Link>
  )
}
