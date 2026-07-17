"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import {
  PRICE_TYPES,
  RENT_PERIODS,
  type GeoAreaThana,
  type GeoCityCorporation,
  type GeoCityUpazila,
  type GeoDistrict,
  type GeoDivision,
  type ListingLocationInput,
  type PriceType,
  type PublicListing,
  type RentPeriod,
  type UpdateListingInput,
} from "@bdph/types"
import {
  ApiError,
  getAreasThanas,
  getCitiesUpazilas,
  getCityCorporations,
  getDistricts,
  getDivisions,
  updateListing,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// A whole, non-negative integer amount of taka (or empty for "not set").
const WHOLE_NUMBER = /^\d+$/
// Radix Select rejects an empty-string item value, so "not chosen yet" is
// represented by this sentinel and translated back to "" at the boundary.
const UNSET = "__unset__"

type EditorT = ReturnType<typeof useTranslations>

type Props = {
  listing: PublicListing
  onUpdated: (listing: PublicListing) => void
  t: EditorT
}

// Per-draft "Location & price" editor. Sellers fill these in after creating a
// draft so the listing is complete enough to show meaningfully in the public
// catalog. Persists via PATCH /listings/:id and hands the refreshed listing back
// to the parent. Location is collected as a cascade — division → district (Zilla)
// → city/upazila → area/thana — plus an optional city-corporation tag; district is
// required, the finer levels are optional. Only area-level administrative location
// is collected — exact coordinates/address are out of scope here (A5/MAP-2).
export function ListingEditor({ listing, onUpdated, t }: Props) {
  const locale = useLocale()
  const isRent = listing.transactionType === "rent"

  const [divisions, setDivisions] = useState<GeoDivision[]>([])
  const [districts, setDistricts] = useState<GeoDistrict[]>([])
  const [citiesUpazilas, setCitiesUpazilas] = useState<GeoCityUpazila[]>([])
  const [areasThanas, setAreasThanas] = useState<GeoAreaThana[]>([])
  const [cityCorporations, setCityCorporations] = useState<GeoCityCorporation[]>([])
  const [geoError, setGeoError] = useState(false)

  const [divisionId, setDivisionId] = useState(listing.location?.divisionId ?? "")
  const [districtId, setDistrictId] = useState(listing.location?.districtId ?? "")
  const [cityUpazilaId, setCityUpazilaId] = useState(listing.location?.cityUpazilaId ?? "")
  const [areaThanaId, setAreaThanaId] = useState(listing.location?.areaThanaId ?? "")
  const [cityCorporationId, setCityCorporationId] = useState(
    listing.location?.cityCorporationId ?? "",
  )
  const [amount, setAmount] = useState(
    listing.pricing.amountBdt != null ? String(listing.pricing.amountBdt) : "",
  )
  const [priceType, setPriceType] = useState<PriceType>(listing.pricing.priceType ?? "fixed")
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>(listing.pricing.rentPeriod ?? "monthly")

  const [formError, setFormError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Divisions and the city-corporation tag list are reference data — load once.
  useEffect(() => {
    let active = true
    Promise.all([getDivisions(), getCityCorporations()])
      .then(([divisionList, corporationList]) => {
        if (!active) return
        setDivisions(divisionList)
        setCityCorporations(corporationList)
      })
      .catch(() => {
        if (active) setGeoError(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Each finer level cascades off its parent id. The list reloads whenever the
  // parent changes; the initial run loads the saved parent's children so the saved
  // selection shows. Child selections are cleared in the change handlers, not here,
  // so a saved chain survives the mount.
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

  useEffect(() => {
    if (!districtId) {
      setCitiesUpazilas([])
      return
    }
    let active = true
    getCitiesUpazilas(districtId)
      .then((data) => {
        if (active) setCitiesUpazilas(data)
      })
      .catch(() => {
        if (active) setGeoError(true)
      })
    return () => {
      active = false
    }
  }, [districtId])

  useEffect(() => {
    if (!cityUpazilaId) {
      setAreasThanas([])
      return
    }
    let active = true
    getAreasThanas(cityUpazilaId)
      .then((data) => {
        if (active) setAreasThanas(data)
      })
      .catch(() => {
        if (active) setGeoError(true)
      })
    return () => {
      active = false
    }
  }, [cityUpazilaId])

  // Changing a level invalidates every finer selection under it.
  function handleDivisionChange(value: string) {
    setDivisionId(value)
    setDistrictId("")
    setCityUpazilaId("")
    setAreaThanaId("")
    setIsSaved(false)
  }

  function handleDistrictChange(value: string) {
    setDistrictId(value)
    setCityUpazilaId("")
    setAreaThanaId("")
    setIsSaved(false)
  }

  function handleUpazilaChange(value: string) {
    setCityUpazilaId(value)
    setAreaThanaId("")
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

    // Only send a location when a district is chosen; the API derives the division
    // from it and validates each finer level against its parent. The finer ids are
    // included only when set, so the chain sent is always self-consistent.
    const location: ListingLocationInput | undefined = districtId
      ? {
          districtId,
          cityUpazilaId: cityUpazilaId || undefined,
          areaThanaId: cityUpazilaId && areaThanaId ? areaThanaId : undefined,
          cityCorporationId: cityCorporationId || undefined,
        }
      : undefined

    const input: UpdateListingInput = {
      location,
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
          <Select
            value={divisionId || UNSET}
            onValueChange={(next) => handleDivisionChange(next === UNSET ? "" : next)}
          >
            <SelectTrigger id={`division-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>{t("divisionPlaceholder")}</SelectItem>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {locale === "bn" ? division.nameBn : division.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`district-${listing.id}`}>{t("districtLabel")}</Label>
          <Select
            value={districtId || UNSET}
            onValueChange={(next) => handleDistrictChange(next === UNSET ? "" : next)}
            disabled={!divisionId}
          >
            <SelectTrigger id={`district-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>{t("districtPlaceholder")}</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district.id} value={district.id}>
                  {locale === "bn" ? district.nameBn : district.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`upazila-${listing.id}`}>{t("cityUpazilaLabel")}</Label>
          <Select
            value={cityUpazilaId || UNSET}
            onValueChange={(next) => handleUpazilaChange(next === UNSET ? "" : next)}
            disabled={!districtId}
          >
            <SelectTrigger id={`upazila-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>{t("cityUpazilaPlaceholder")}</SelectItem>
              {citiesUpazilas.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {locale === "bn" ? row.nameBn : row.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`area-${listing.id}`}>{t("areaThanaLabel")}</Label>
          <Select
            value={areaThanaId || UNSET}
            onValueChange={(next) => {
              setAreaThanaId(next === UNSET ? "" : next)
              setIsSaved(false)
            }}
            disabled={!cityUpazilaId}
          >
            <SelectTrigger id={`area-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>{t("areaThanaPlaceholder")}</SelectItem>
              {areasThanas.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {locale === "bn" ? row.nameBn : row.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`cityCorporation-${listing.id}`}>{t("cityCorporationLabel")}</Label>
          <Select
            value={cityCorporationId || UNSET}
            onValueChange={(next) => {
              setCityCorporationId(next === UNSET ? "" : next)
              setIsSaved(false)
            }}
          >
            <SelectTrigger id={`cityCorporation-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>{t("cityCorporationPlaceholder")}</SelectItem>
              {cityCorporations.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {locale === "bn" ? row.nameBn : row.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select
            value={priceType}
            onValueChange={(value) => {
              setPriceType(value as PriceType)
              setIsSaved(false)
            }}
          >
            <SelectTrigger id={`priceType-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICE_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`priceTypes.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isRent ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`rentPeriod-${listing.id}`}>{t("rentPeriodLabel")}</Label>
            <Select
              value={rentPeriod}
              onValueChange={(value) => {
                setRentPeriod(value as RentPeriod)
                setIsSaved(false)
              }}
            >
              <SelectTrigger id={`rentPeriod-${listing.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENT_PERIODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`rentPeriods.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
