"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, LoaderCircle, MapPin } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { ApiError, getPublicListing } from "@/lib/api"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatNumber,
  listingDescription,
  listingTitle,
  locationLabel,
  orderedPhotos,
  priceLabel,
} from "@/lib/listing-display"
import { ListingGallery } from "./listing-gallery"
import { SaveListingButton } from "./save-listing-button"

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "notFound" }
  | { status: "ready"; listing: PublicListing }

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

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
        <p className="mt-3 text-sm">{t("loading")}</p>
      </div>
    )
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
  const { attributes } = listing

  // Build the present attributes into translated chips, skipping anything unset.
  const chips: string[] = []
  if (attributes.rooms != null) chips.push(t("attributes.rooms", { count: attributes.rooms }))
  if (attributes.washrooms != null)
    chips.push(t("attributes.washrooms", { count: attributes.washrooms }))
  if (attributes.areaSqft != null)
    chips.push(t("attributes.areaSqft", { value: formatNumber(attributes.areaSqft, locale) }))
  if (attributes.landSizeValue != null && attributes.landSizeUnit)
    chips.push(
      t("attributes.landSize", {
        value: formatNumber(attributes.landSizeValue, locale),
        unit: t(`landUnits.${attributes.landSizeUnit}`),
      }),
    )
  if (attributes.facing)
    chips.push(t("attributes.facing", { facing: t(`facings.${attributes.facing}`) }))

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

          <SaveListingButton listingId={listing.id} />

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
                    key={chip}
                    className="rounded-full bg-muted px-3 py-1 text-sm text-foreground"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {description ? (
        <div className="max-w-3xl">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {t("descriptionTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {description}
          </p>
        </div>
      ) : null}
    </div>
  )
}
