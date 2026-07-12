"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import type { PublicGeoPoint, PublicListing } from "@bdph/types"
import { ApiError, updateListing } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { LocationMap } from "@/components/map/location-map"

// Where the map opens before a pin exists: roughly the middle of Bangladesh, wide
// enough to see the whole service area.
const BANGLADESH_CENTER: PublicGeoPoint = { lat: 23.685, lng: 90.3563 }
const COUNTRY_ZOOM = 6
const PIN_ZOOM = 15

type EditorT = ReturnType<typeof useTranslations>

type Props = {
  listing: PublicListing
  onUpdated: (listing: PublicListing) => void
  t: EditorT
}

// Per-draft "Map pin" editor (MAP-1/MAP-2). The seller clicks (or drags) to place
// their property's EXACT pin. The exact point is visible only to them and staff;
// the public catalog gets a server-fuzzed point — the note below the map says so,
// so sellers know dropping a precise pin doesn't expose their address.
export function ListingPinEditor({ listing, onUpdated, t }: Props) {
  // Owner projections carry exactPoint; that's the pin the seller placed.
  const savedPin = listing.exactPoint ?? null
  const [pin, setPin] = useState<PublicGeoPoint | null>(savedPin)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const hasChange =
    (pin?.lat ?? null) !== (savedPin?.lat ?? null) || (pin?.lng ?? null) !== (savedPin?.lng ?? null)

  function persist(nextPin: PublicGeoPoint | null) {
    setFormError(null)
    setIsSaved(false)
    startTransition(async () => {
      try {
        const updated = await updateListing(listing.id, { pin: nextPin })
        onUpdated(updated)
        setPin(nextPin)
        setIsSaved(true)
      } catch (error) {
        setFormError(error instanceof ApiError ? error.message : t("saveError"))
      }
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="font-medium text-foreground">{t("pinTitle")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("pinPrivacyNote")}</p>

      <LocationMap
        center={savedPin ?? BANGLADESH_CENTER}
        zoom={savedPin ? PIN_ZOOM : COUNTRY_ZOOM}
        marker={pin}
        onPick={(point) => {
          setPin(point)
          setIsSaved(false)
        }}
        className="mt-3 h-64 w-full overflow-hidden rounded-lg border border-border/60"
      />

      {formError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {formError}
        </p>
      ) : null}
      {isSaved && !formError ? <p className="mt-2 text-xs text-olive">{t("saved")}</p> : null}

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || !pin || !hasChange}
          onClick={() => pin && persist(pin)}
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending ? t("saving") : t("pinSaveCta")}
        </Button>
        {savedPin ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setPin(null)
              persist(null)
            }}
          >
            {t("pinRemoveCta")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
