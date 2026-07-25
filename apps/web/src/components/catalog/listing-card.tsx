"use client"

import { type MouseEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { ImageOff, MapPin } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { coverPhoto, listingTitle, locationLabel, priceLabel } from "@/lib/listing-display"
import type { SavedListings } from "@/hooks/use-saved-listings"
import { SaveControl } from "./save-control"

type Props = {
  listing: PublicListing
  saved: SavedListings
  active: boolean
  selectable: boolean
  onSelect: (listing: PublicListing) => void
}

// One catalog grid card: a full-bleed cover image with a floating category badge
// (top-left), a save bookmark (top-right), and a frosted info panel at the bottom
// carrying title, location, and price. Plain <img> (not next/image) keeps
// Cloudinary delivery URLs working without remote-host config — the URLs already
// carry f_auto,q_auto.
//
// The whole card is a link to the detail page. When the preview rail is visible
// (`selectable`), a plain left-click previews in place instead; modifier-clicks
// (new tab) and no-JS still follow the link, so it degrades cleanly.
export function ListingCard({ listing, saved, active, selectable, onSelect }: Props) {
  const t = useTranslations("catalog")
  const locale = useLocale()
  const cover = coverPhoto(listing.media)
  const title = listingTitle(listing, locale)
  const place = locationLabel(listing.location, locale)
  const price = priceLabel(listing.pricing, locale, t)

  // Carry the active catalog query onto the detail link so the detail page's
  // "back to browse" returns to the same search/filters/sort (and a shared link
  // keeps that context). The detail page keys off the route id, not these params.
  const catalogQuery = useSearchParams().toString()
  const href = catalogQuery ? `/catalog/${listing.id}?${catalogQuery}` : `/catalog/${listing.id}`

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Only a plain primary-button POINTER click previews in place. `detail === 0`
    // means the click was synthesised by the keyboard (Enter on the focused link)
    // or assistive tech — let those navigate to the detail page as a link should.
    // Modifier / middle clicks also fall through so "open in new tab" keeps working.
    if (
      selectable &&
      event.detail !== 0 &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault()
      onSelect(listing)
    }
  }

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 transition-shadow",
        active ? "ring-2 ring-primary" : "ring-border hover:shadow-md",
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
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

        {/* Soft scrim so overlaid chrome stays legible on any photo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-black/10"
        />

        {/* Category badges (top-left). */}
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="border border-border/60 bg-card/90 text-foreground shadow-sm backdrop-blur"
          >
            {t(`transactionTypes.${listing.transactionType}`)}
          </Badge>
          {listing.isGroupPurchase ? (
            <Badge variant="outline" className="bg-card/85 backdrop-blur">
              {t("groupPurchase")}
            </Badge>
          ) : null}
        </div>

        {/* Real save bookmark (top-right), above the stretched link. */}
        <SaveControl
          listingId={listing.id}
          saved={saved}
          variant="icon"
          className="absolute top-3 right-3 z-20"
        />

        {/* Stretched click target covering the card. Its accessible name carries
            the title, price, and place so screen-reader users get the full
            summary once — the visual panel below is aria-hidden to avoid a
            duplicate announcement. */}
        <Link
          href={href}
          onClick={handleClick}
          aria-label={place ? `${title}, ${price}, ${place}` : `${title}, ${price}`}
          aria-current={active ? "true" : undefined}
          className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        />

        {/* Frosted info panel (bottom). pointer-events-none so clicks fall through
            to the stretched link beneath it; aria-hidden as the link already
            conveys this text. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 bottom-3 z-0 rounded-xl bg-card/95 p-3 shadow-sm backdrop-blur"
        >
          <p className="line-clamp-1 font-heading text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{place ?? t("locationUnset")}</span>
          </p>
          <p className="mt-1.5 font-heading text-base font-bold text-primary">{price}</p>
        </div>
      </div>
    </article>
  )
}
