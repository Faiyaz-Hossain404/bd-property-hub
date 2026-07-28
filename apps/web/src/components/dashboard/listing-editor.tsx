"use client"

import { useEffect, useState, useTransition, type FormEvent, type RefObject } from "react"
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
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// A whole, non-negative integer amount of taka (or empty for "not set").
const WHOLE_NUMBER = /^\d+$/
// Radix Select rejects an empty-string item value, so "not chosen yet" is
// represented by this sentinel and translated back to "" at the boundary.
const UNSET = "__unset__"

type EditorT = ReturnType<typeof useTranslations>

// Persists whatever is currently typed into this form. `requireLocation` is set
// by the Submit flow: the manual Save button is happy to store a price with no
// location (a half-filled draft is legitimate), but submitting for review is not,
// so that caller asks for the stricter check and gets a message naming the field.
export type ListingEditorSave = (options?: {
  requireLocation?: boolean
}) => Promise<PublicListing>

type Props = {
  listing: PublicListing
  onUpdated: (listing: PublicListing) => void
  t: EditorT
  // Filled in by this component so a parent can save on the user's behalf. The
  // form's fields live in local state here, so without this the Submit button
  // has no way to flush them — which is exactly how a visibly-filled district
  // ended up never reaching the database.
  saveRef?: RefObject<ListingEditorSave | null>
  // The Save button lives outside this component now, at the bottom of the
  // editor's right column beside Submit for review. It reaches back in with the
  // native `form` attribute (<button type="submit" form={formId}>), which keeps
  // real form semantics — Enter-to-submit, validation — without lifting any of
  // this component's state into the parent.
  formId: string
  // Mirrors the in-flight save outward so that relocated button can show its own
  // spinner and disable itself.
  onSavingChange?: (saving: boolean) => void
}

// Per-draft "Location & price" editor. Sellers fill these in after creating a
// draft so the listing is complete enough to show meaningfully in the public
// catalog. Persists via PATCH /listings/:id and hands the refreshed listing back
// to the parent. Location is collected as a cascade — division → district (Zilla)
// → city/upazila → area/thana — plus an optional city-corporation tag; district is
// required, the finer levels are optional. Only area-level administrative location
// is collected — exact coordinates/address are out of scope here (A5/MAP-2).
export function ListingEditor({
  listing,
  onUpdated,
  t,
  formId,
  onSavingChange,
  saveRef,
}: Props) {
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

  // Keep the relocated Save button in step with this form's in-flight state.
  // `onSavingChange` is a setState updater from the parent, so its identity is
  // stable and this cannot loop.
  useEffect(() => {
    onSavingChange?.(isPending)
  }, [isPending, onSavingChange])

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

  // Every level is populated and usable from the start: with a parent chosen the
  // list is narrowed to that parent's children, and WITHOUT one it falls back to
  // the whole level (all three endpoints take an optional parent filter). That is
  // what lets the fields be enabled immediately instead of sitting empty and
  // disabled until the level above them is answered.
  useEffect(() => {
    let active = true
    getDistricts(divisionId || undefined)
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
    let active = true
    getCitiesUpazilas(districtId || undefined)
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
    let active = true
    getAreasThanas(cityUpazilaId || undefined)
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

  // Selecting any level back-fills the levels ABOVE it from the chosen record's
  // own parent id, and clears the levels below. Without this, picking straight
  // out of a full list (say an area, with no district set) would send the API a
  // chain it validates and rejects — geo.service.ts requires an upazila to
  // belong to its district. Ancestors snapping to match the finest choice is
  // also the behaviour a seller expects: the last thing they picked wins.
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
    const picked = districts.find((district) => district.id === value)
    if (picked) setDivisionId(picked.divisionId)
    setIsSaved(false)
  }

  function handleUpazilaChange(value: string) {
    setCityUpazilaId(value)
    setAreaThanaId("")
    const picked = citiesUpazilas.find((row) => row.id === value)
    if (picked) {
      setDistrictId(picked.districtId)
      const parentDistrict = districts.find((district) => district.id === picked.districtId)
      if (parentDistrict) setDivisionId(parentDistrict.divisionId)
    }
    setIsSaved(false)
  }

  function handleAreaChange(value: string) {
    setAreaThanaId(value)
    const picked = areasThanas.find((row) => row.id === value)
    if (picked) {
      setCityUpazilaId(picked.cityUpazilaId)
      const parentUpazila = citiesUpazilas.find((row) => row.id === picked.cityUpazilaId)
      if (parentUpazila) {
        setDistrictId(parentUpazila.districtId)
        const parentDistrict = districts.find((d) => d.id === parentUpazila.districtId)
        if (parentDistrict) setDivisionId(parentDistrict.divisionId)
      }
    }
    setIsSaved(false)
  }

  // The single write path for this form. Every failure sets the inline error AND
  // throws the same text, so the Save button can stay silent (the message is
  // already on screen next to the fields) while the Submit flow can put that
  // exact reason in a toast — one message, two surfaces, no drift.
  const save: ListingEditorSave = async (options) => {
    setFormError(null)
    setIsSaved(false)

    function fail(message: string): never {
      setFormError(message)
      throw new Error(message)
    }

    const trimmedAmount = amount.trim()
    const hasAmount = trimmedAmount.length > 0
    if (hasAmount && !WHOLE_NUMBER.test(trimmedAmount)) {
      fail(t("priceInvalid"))
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

    // District is the level the API actually stores a location at, so a seller
    // who picked only a Division has, as far as the database is concerned, set
    // no location at all. Saying so here names the field, instead of letting the
    // submit come back with a generic "add the listing's location".
    if (options?.requireLocation && !location) {
      fail(t("districtRequired"))
    }

    const input: UpdateListingInput = {
      location,
      pricing: {
        amountBdt: priceType === "on_request" || !hasAmount ? undefined : Number(trimmedAmount),
        priceType,
        rentPeriod: isRent ? rentPeriod : undefined,
      },
    }

    try {
      const updated = await updateListing(listing.id, input)
      onUpdated(updated)
      setIsSaved(true)
      return updated
    } catch (error) {
      fail(error instanceof ApiError ? error.message : t("saveError"))
    }
  }

  // No dependency array on purpose: `save` closes over this render's field state,
  // so the ref has to be refreshed every render or the Submit button would flush
  // whatever was typed at mount time.
  useEffect(() => {
    if (!saveRef) return
    saveRef.current = save
    return () => {
      saveRef.current = null
    }
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      // save() has already put the reason on screen; nothing further to do here.
      await save().catch(() => {})
    })
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="rounded-lg border border-border/60 bg-muted/30 p-3"
    >
      <p className="font-medium text-foreground">{t("editTitle")}</p>

      {geoError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t("geoLoadError")}
        </p>
      ) : null}

      {/* `min-w-0` on the grid and on every cell below: a grid item's default
          min-width is auto, so a column will happily grow past its track to fit
          a long select label. That is what pushed these fields outside the card.
          grid-cols-1 is explicit so the fields stack rather than squeeze when
          the card itself is narrow. */}
      <div className="mt-3 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
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

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`district-${listing.id}`}>{t("districtLabel")}</Label>
          <Select
            value={districtId || UNSET}
            onValueChange={(next) => handleDistrictChange(next === UNSET ? "" : next)}
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

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`upazila-${listing.id}`}>{t("cityUpazilaLabel")}</Label>
          <Select
            value={cityUpazilaId || UNSET}
            onValueChange={(next) => handleUpazilaChange(next === UNSET ? "" : next)}
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

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`area-${listing.id}`}>{t("areaThanaLabel")}</Label>
          <Select
            value={areaThanaId || UNSET}
            onValueChange={(next) => handleAreaChange(next === UNSET ? "" : next)}
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

        <div className="grid min-w-0 gap-1.5">
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

      {/* `min-w-0` on the grid and on every cell below: a grid item's default
          min-width is auto, so a column will happily grow past its track to fit
          a long select label. That is what pushed these fields outside the card.
          grid-cols-1 is explicit so the fields stack rather than squeeze when
          the card itself is narrow. */}
      <div className="mt-3 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`amount-${listing.id}`}>{t("priceLabel")}</Label>
          <NumericInput
            id={`amount-${listing.id}`}
            value={amount}
            onValueChange={(next) => {
              setAmount(next)
              setIsSaved(false)
            }}
            placeholder={t("pricePlaceholder")}
            disabled={priceType === "on_request"}
            aria-invalid={Boolean(formError)}
          />
        </div>

        <div className="grid min-w-0 gap-1.5">
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
          <div className="grid min-w-0 gap-1.5">
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
      {/* No submit button here — it is rendered by ListingRow at the bottom of
          the right column, bound back to this form by id. */}
    </form>
  )
}
