"use client"

import { useEffect, useState, useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Eye, Heart, LoaderCircle } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { ApiError, getSavedListings, unsaveListing } from "@/lib/api"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { locationLabel, priceLabel } from "@/lib/listing-display"

type SectionT = ReturnType<typeof useTranslations>

// Buyer's saved properties on the dashboard. Loads the hydrated favorites once,
// lets the user open a listing or remove it from their saves. Listings that are
// no longer public are already filtered out server-side, so the list only ever
// shows currently-viewable properties.
export function SavedSection() {
  const t = useTranslations("dashboard.saved")
  const [listings, setListings] = useState<PublicListing[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    getSavedListings()
      .then((data) => {
        if (active) setListings(data)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [])

  function handleRemoved(id: string) {
    setListings((prev) => prev?.filter((listing) => listing.id !== id) ?? null)
  }

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="font-heading text-xl font-semibold text-foreground">{t("sectionTitle")}</h2>
      <Card className="mt-4 gap-0 p-0">
        <CardHeader className="border-b px-6 py-5">
          <CardTitle className="text-lg">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-2">
          <div className="divide-y divide-border/60">
            {listings === null && !loadError ? (
              <p className="py-4 text-sm text-muted-foreground">{t("loading")}</p>
            ) : null}
            {loadError ? <p className="py-4 text-sm text-destructive">{t("loadError")}</p> : null}
            {listings !== null && listings.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
            ) : null}
            {listings?.map((listing) => (
              <SavedRow key={listing.id} listing={listing} onRemoved={handleRemoved} t={t} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SavedRow({
  listing,
  onRemoved,
  t,
}: {
  listing: PublicListing
  onRemoved: (id: string) => void
  t: SectionT
}) {
  const locale = useLocale()
  const ct = useTranslations("catalog")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const place = locationLabel(listing.location, locale)
  const price = priceLabel(listing.pricing, locale, ct)

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      try {
        await unsaveListing(listing.id)
        onRemoved(listing.id)
      } catch (removeError) {
        setError(removeError instanceof ApiError ? removeError.message : t("removeError"))
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{listing.titleEn}</p>
          <p className="text-xs text-muted-foreground">
            {place ?? ct("locationUnset")} · {price}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/catalog/${listing.id}`}>
              <Eye className="size-4" />
              {t("view")}
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleRemove} disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Heart className="size-4 fill-current" />
            )}
            {t("remove")}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
