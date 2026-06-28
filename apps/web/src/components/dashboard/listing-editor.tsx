"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import {
  PRICE_TYPES,
  RENT_PERIODS,
  type GeoDistrict,
  type GeoDivision,
  type PriceType,
  type PublicListing,
  type RentPeriod,
  type UpdateListingInput,
} from "@bdph/types"
import { ApiError, getDistricts, getDivisions, updateListing } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

// A whole, non-negative integer amount of taka (or empty for "not set").
const WHOLE_NUMBER = /^\d+$/

type EditorT = ReturnType<typeof useTranslations>

type Props = {
  listing: PublicListing
  onUpdated: (listing: PublicListing) => void
  t: EditorT
}

// Per-draft "Location & price" editor. Sellers fill these in after creating a
// draft so the listing is complete enough to show meaningfully in the public
// catalog. Persists via PATCH /listings/:id and hands the refreshed listing back
// to the parent. Only area-level location (district → division) is collected —
// exact coordinates/address are out of scope (A5/MAP-2).
export function ListingEditor({ listing, onUpdated, t }: Props) {
  const locale = useLocale()
  const isRent = listing.transactionType === "rent"

  const [divisions, setDivisions] = useState<GeoDivision[]>([])
  const [districts, setDistricts] = useState<GeoDistrict[]>([])
  const [geoError, setGeoError] = useState(false)

  const [divisionId, setDivisionId] = useState(listing.location?.divisionId ?? "")
  const [districtId, setDistrictId] = useState(listing.location?.districtId ?? "")
  const [amount, setAmount] = useState(
    listing.pricing.amountBdt != null ? String(listing.pricing.amountBdt) : "",
  )
  const [priceType, setPriceType] = useState<PriceType>(listing.pricing.priceType ?? "fixed")
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>(listing.pricing.rentPeriod ?? "monthly")

  const [formError, setFormError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Divisions are reference data — load once.
  useEffect(() => {
    let active = true
    getDivisions()
      .then((data) => {
        if (active) setDivisions(data)
      })
      .catch(() => {
        if (active) setGeoError(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Districts cascade off the selected division. Reloads on every change; the
  // initial run loads the saved division's districts so the saved district shows.
  useEffect(() => {
    if (!divisionId) {
      setDistricts([])
      return
    }
    let active = true
    getDistricts(divisionId)
      .then((data) => {
        if (active) setDistricts(data)
      })
      .catch(() => {
        if (active) setGeoError(true)
      })
    return () => {
      active = false
    }
  }, [divisionId])

  function handleDivisionChange(value: string) {
    setDivisionId(value)
    // The previously selected district belongs to the old division — clear it.
    setDistrictId("")
    setIsSaved(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setIsSaved(false)

    const trimmedAmount = amount.trim()
    const hasAmount = trimmedAmount.length > 0
    if (hasAmount && !WHOLE_NUMBER.test(trimmedAmount)) {
      setFormError(t("priceInvalid"))
      return
    }

    const input: UpdateListingInput = {
      // Only send a location when a district is chosen; the API derives the
      // division from it.
      location: districtId ? { districtId } : undefined,
      pricing: {
        amountBdt: priceType === "on_request" || !hasAmount ? undefined : Number(trimmedAmount),
        priceType,
        rentPeriod: isRent ? rentPeriod : undefined,
      },
    }

    startTransition(async () => {
      try {
        const updated = await updateListing(listing.id, input)
        onUpdated(updated)
        setIsSaved(true)
      } catch (error) {
        setFormError(error instanceof ApiError ? error.message : t("saveError"))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="font-medium text-foreground">{t("editTitle")}</p>

      {geoError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t("geoLoadError")}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`division-${listing.id}`}>{t("divisionLabel")}</Label>
          <select
            id={`division-${listing.id}`}
            value={divisionId}
            onChange={(event) => handleDivisionChange(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">{t("divisionPlaceholder")}</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {locale === "bn" ? division.nameBn : division.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`district-${listing.id}`}>{t("districtLabel")}</Label>
          <select
            id={`district-${listing.id}`}
            value={districtId}
            onChange={(event) => {
              setDistrictId(event.target.value)
              setIsSaved(false)
            }}
            disabled={!divisionId}
            className={SELECT_CLASS}
          >
            <option value="">{t("districtPlaceholder")}</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {locale === "bn" ? district.nameBn : district.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`amount-${listing.id}`}>{t("priceLabel")}</Label>
          <Input
            id={`amount-${listing.id}`}
            inputMode="numeric"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              setIsSaved(false)
            }}
            placeholder={t("pricePlaceholder")}
            disabled={priceType === "on_request"}
            aria-invalid={Boolean(formError)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`priceType-${listing.id}`}>{t("priceTypeLabel")}</Label>
          <select
            id={`priceType-${listing.id}`}
            value={priceType}
            onChange={(event) => {
              setPriceType(event.target.value as PriceType)
              setIsSaved(false)
            }}
            className={SELECT_CLASS}
          >
            {PRICE_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`priceTypes.${value}`)}
              </option>
            ))}
          </select>
        </div>

        {isRent ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`rentPeriod-${listing.id}`}>{t("rentPeriodLabel")}</Label>
            <select
              id={`rentPeriod-${listing.id}`}
              value={rentPeriod}
              onChange={(event) => {
                setRentPeriod(event.target.value as RentPeriod)
                setIsSaved(false)
              }}
              className={SELECT_CLASS}
            >
              {RENT_PERIODS.map((value) => (
                <option key={value} value={value}>
                  {t(`rentPeriods.${value}`)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {formError}
        </p>
      ) : null}
      {isSaved && !formError ? <p className="mt-2 text-xs text-olive">{t("saved")}</p> : null}

      <Button type="submit" size="sm" variant="outline" disabled={isPending} className="mt-3">
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? t("saving") : t("saveCta")}
      </Button>
    </form>
  )
}
