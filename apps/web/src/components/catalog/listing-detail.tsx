"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, MapPin } from "lucide-react"

import { PIN_FUZZ_MAX_METERS, type PublicListing } from "@bdph/types"
import { ApiError, getPublicListing } from "@/lib/api"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  attributeChips,
  listingDescription,
  listingTitle,
  locationLabel,
  orderedPhotos,
  priceLabel,
} from "@/lib/listing-display"
import { WhatsAppButton } from "@/components/contact/whatsapp-button"
import { WHATSAPP_BUYER_SUPPORT } from "@/lib/contact"
import { ListingGallery } from "./listing-gallery"
import { ListingDetailSkeleton } from "./listing-detail-skeleton"
import { SaveListingButton } from "./save-listing-button"
import { ListingModerationControls } from "./listing-moderation-controls"
import { LocationMap } from "@/components/map/location-map"

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "notFound" }
  | { status: "ready"; listing: PublicListing }

// The two primary actions sit side by side, so their geometry lives in one
// constant handed to both instead of being typed twice and drifting apart.
// `h-auto` matters: every Button size variant pins an explicit `h-*`, which would
// otherwise win over the padding and leave the two buttons different heights.
const ACTION_BUTTON = "h-auto rounded-lg px-5 py-2.5 text-base font-semibold"
// WhatsApp's brand green, not a theme token — this button is recognised by its
// colour, and a palette change should not repaint it into something else.
const WHATSAPP_BRAND = "bg-[#25D366] text-white hover:bg-[#20bd5a]"

// backQuery is the catalog's own query string (facets + sort), forwarded from the
// card the buyer clicked. Empty for a deep-linked detail page, where we fall back
// to the unfiltered catalog.
function BackLink({ label, backQuery }: { label: string; backQuery: string }) {
  return (
    <Link
      href={backQuery ? `/catalog?${backQuery}` : "/catalog"}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  )
}

export function ListingDetail({ id, backQuery }: { id: string; backQuery: string }) {
  const t = useTranslations("catalog")
  const tWhatsapp = useTranslations("whatsapp")
  const locale = useLocale()
  const [state, setState] = useState<State>({ status: "loading" })
  const startedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })
    try {
      const listing = await getPublicListing(id)
      setState({ status: "ready", listing })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setState({ status: "notFound" })
        return
      }
      setState({ status: "error" })
    }
  }, [id])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void load()
  }, [load])

  // Same shape as the route-level loading.tsx so the content area doesn't
  // flicker skeleton -> spinner -> content as this client component takes over
  // from the route Suspense boundary and waits on getPublicListing().
  if (state.status === "loading") {
    return <ListingDetailSkeleton />
  }

  if (state.status === "notFound") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <BackLink label={t("backToBrowse")} backQuery={backQuery} />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-destructive">{t("detailLoadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t("retry")}
        </Button>
        <BackLink label={t("backToBrowse")} backQuery={backQuery} />
      </div>
    )
  }

  const { listing } = state
  const title = listingTitle(listing, locale)
  const description = listingDescription(listing, locale)
  const place = locationLabel(listing.location, locale)
  const price = priceLabel(listing.pricing, locale, t)
  const photos = orderedPhotos(listing.media)
  const chips = attributeChips(listing.attributes, locale, t)

  return (
    <div className="flex flex-col gap-6">
      <BackLink label={t("backToBrowse")} backQuery={backQuery} />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <ListingGallery photos={photos} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{t(`transactionTypes.${listing.transactionType}`)}</Badge>
            <Badge variant="outline">{t(`assetTypes.${listing.assetType}`)}</Badge>
            {listing.isGroupPurchase ? (
              <Badge variant="outline">{t("groupPurchase")}</Badge>
            ) : null}
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>

          <p className="font-heading text-2xl font-bold text-clay">{price}</p>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buyer inquiry → WhatsApp buyer support desk, pre-filled with the
                listing title so support has context. */}
            <WhatsAppButton
              number={WHATSAPP_BUYER_SUPPORT}
              label={tWhatsapp("inquireCta")}
              message={tWhatsapp("buyerInquiry", { title })}
              className={`${ACTION_BUTTON} ${WHATSAPP_BRAND}`}
            />
            <SaveListingButton listingId={listing.id} className={ACTION_BUTTON} />
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            {place ?? t("locationUnset")}
          </p>

          {chips.length > 0 ? (
            <div>
              <h2 className="font-heading text-sm font-semibold text-foreground">
                {t("detailsTitle")}
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li
                    key={chip.key}
                    className="rounded-full bg-muted px-3 py-1 text-sm text-foreground"
                  >
                    {chip.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Description and map sit in this column directly under Details rather
              than below the gallery. Below the gallery they started after the full
              height of a large photo, so on a desktop viewport the buyer scrolled
              past a screen of empty column to reach them — the facts about the
              property now read as one continuous block beside the photos. */}
          {description ? (
            <div>
              <h2 className="font-heading text-sm font-semibold text-foreground">
                {t("descriptionTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {description}
              </p>
            </div>
          ) : null}

          {/* Approximate map (MAP-2): the API only ever sends the fuzzed displayPoint,
              so this map is honest by construction — the circle marks "around here",
              never the address. */}
          {listing.displayPoint ? (
            <div>
              <h2 className="font-heading text-sm font-semibold text-foreground">
                {t("mapTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("mapApproximateNote")}</p>
              <LocationMap
                center={listing.displayPoint}
                zoom={14}
                marker={listing.displayPoint}
                circleRadiusMeters={PIN_FUZZ_MAX_METERS}
                className="mt-3 h-72 w-full overflow-hidden rounded-xl border border-border/60"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Staff-only takedown panel (MOD-3). Renders nothing for buyers. */}
      <div className="max-w-3xl">
        <ListingModerationControls listingId={listing.id} />
      </div>
    </div>
  )
}
