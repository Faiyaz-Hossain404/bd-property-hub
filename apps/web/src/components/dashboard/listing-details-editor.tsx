"use client"

import { useEffect, useState, useTransition, type FormEvent, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import {
  FACINGS,
  LAND_SIZE_UNITS,
  type Facing,
  type LandSizeUnit,
  type PublicListing,
  type UpdateListingInput,
} from "@bdph/types"
import { ApiError, updateListing } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const TEXTAREA_CLASS =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"

// Whole, non-negative count (rooms, washrooms).
const WHOLE_NUMBER = /^\d+$/
// Non-negative amount, optionally with a decimal part (area, land size).
const DECIMAL_NUMBER = /^\d+(\.\d+)?$/
// Radix Select rejects an empty-string item value, so "not set" is
// represented by this sentinel and translated back to "" at the boundary.
const UNSET = "__unset__"

type EditorT = ReturnType<typeof useTranslations>

export type ListingDetailsSave = () => Promise<PublicListing>

type Props = {
  listing: PublicListing
  onUpdated: (listing: PublicListing) => void
  t: EditorT
  // Same arrangement as ListingEditor: these fields live in local state, so the
  // Submit button needs a handle to flush them before it submits.
  saveRef?: RefObject<ListingDetailsSave | null>
}

// An empty field leaves the stored value unchanged: the API merges attributes
// field-by-field with no "clear" sentinel yet, so this matches the location &
// price editor's behaviour (ListingsService.update).
function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? Number(trimmed) : undefined
}

// Per-draft "Property details" editor — the attributes the public catalog shows
// (rooms, washrooms, area, land size, facing) plus the bilingual description.
// Sellers fill these in after creating a draft; persists via PATCH /listings/:id
// and hands the refreshed listing back to the parent. A separate card from the
// location & price editor so each stays focused.
export function ListingDetailsEditor({ listing, onUpdated, t, saveRef }: Props) {
  const a = listing.attributes

  const [rooms, setRooms] = useState(a.rooms != null ? String(a.rooms) : "")
  const [washrooms, setWashrooms] = useState(a.washrooms != null ? String(a.washrooms) : "")
  const [areaSqft, setAreaSqft] = useState(a.areaSqft != null ? String(a.areaSqft) : "")
  const [landSizeValue, setLandSizeValue] = useState(
    a.landSizeValue != null ? String(a.landSizeValue) : "",
  )
  const [landSizeUnit, setLandSizeUnit] = useState<LandSizeUnit>(a.landSizeUnit ?? "katha")
  const [facing, setFacing] = useState<Facing | "">(a.facing ?? "")
  const [descriptionEn, setDescriptionEn] = useState(listing.descriptionEn ?? "")
  const [descriptionBn, setDescriptionBn] = useState(listing.descriptionBn ?? "")

  const [formError, setFormError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Any edit invalidates the "Saved." confirmation until the next save.
  function markDirty() {
    setIsSaved(false)
  }

  // Single write path, mirroring ListingEditor: failures land inline AND throw
  // the same text so the Submit flow can toast the exact reason.
  const save: ListingDetailsSave = async () => {
    setFormError(null)
    setIsSaved(false)

    function fail(message: string): never {
      setFormError(message)
      throw new Error(message)
    }

    const counts = [rooms, washrooms]
    const sizes = [areaSqft, landSizeValue]
    const hasBadCount = counts.some((value) => value.trim() && !WHOLE_NUMBER.test(value.trim()))
    const hasBadSize = sizes.some((value) => value.trim() && !DECIMAL_NUMBER.test(value.trim()))
    if (hasBadCount) {
      fail(t("countInvalid"))
    }
    if (hasBadSize) {
      fail(t("sizeInvalid"))
    }

    const hasLandSize = landSizeValue.trim().length > 0
    const input: UpdateListingInput = {
      attributes: {
        rooms: toOptionalNumber(rooms),
        washrooms: toOptionalNumber(washrooms),
        areaSqft: toOptionalNumber(areaSqft),
        landSizeValue: toOptionalNumber(landSizeValue),
        // Only send a unit alongside a value so the pair never disagrees.
        landSizeUnit: hasLandSize ? landSizeUnit : undefined,
        facing: facing || undefined,
      },
      // Descriptions are sent verbatim (trimmed) — a clear, replace-style update,
      // so emptying the box removes the text rather than keeping the old copy.
      descriptionEn: descriptionEn.trim(),
      descriptionBn: descriptionBn.trim(),
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

  // No dependency array: `save` closes over this render's field values, so the
  // ref must be refreshed every render.
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
      // save() has already surfaced the reason inline.
      await save().catch(() => {})
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="font-medium text-foreground">{t("detailsTitle")}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`rooms-${listing.id}`}>{t("roomsLabel")}</Label>
          <NumericInput
            id={`rooms-${listing.id}`}
            value={rooms}
            onValueChange={(next) => {
              setRooms(next)
              markDirty()
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`washrooms-${listing.id}`}>{t("washroomsLabel")}</Label>
          <NumericInput
            id={`washrooms-${listing.id}`}
            value={washrooms}
            onValueChange={(next) => {
              setWashrooms(next)
              markDirty()
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`area-${listing.id}`}>{t("areaSqftLabel")}</Label>
          {/* Decimal-capable: areaSqft is z.number().nonnegative(), not .int(). */}
          <NumericInput
            id={`area-${listing.id}`}
            allowDecimal
            value={areaSqft}
            onValueChange={(next) => {
              setAreaSqft(next)
              markDirty()
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`facing-${listing.id}`}>{t("facingLabel")}</Label>
          <Select
            value={facing || UNSET}
            onValueChange={(value) => {
              setFacing(value === UNSET ? "" : (value as Facing))
              markDirty()
            }}
          >
            <SelectTrigger id={`facing-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>{t("facingUnset")}</SelectItem>
              {FACINGS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`facings.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`landSize-${listing.id}`}>{t("landSizeLabel")}</Label>
          {/* Decimal-capable for the same reason as area, and because a plot is
              routinely described as e.g. 2.5 katha. */}
          <NumericInput
            id={`landSize-${listing.id}`}
            allowDecimal
            value={landSizeValue}
            onValueChange={(next) => {
              setLandSizeValue(next)
              markDirty()
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`landSizeUnit-${listing.id}`}>{t("landSizeUnitLabel")}</Label>
          <Select
            value={landSizeUnit}
            onValueChange={(value) => {
              setLandSizeUnit(value as LandSizeUnit)
              markDirty()
            }}
          >
            <SelectTrigger id={`landSizeUnit-${listing.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAND_SIZE_UNITS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`landUnits.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`descriptionEn-${listing.id}`}>{t("descriptionEnLabel")}</Label>
          <textarea
            id={`descriptionEn-${listing.id}`}
            value={descriptionEn}
            onChange={(event) => {
              setDescriptionEn(event.target.value)
              markDirty()
            }}
            maxLength={5000}
            placeholder={t("descriptionPlaceholder")}
            className={TEXTAREA_CLASS}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`descriptionBn-${listing.id}`}>{t("descriptionBnLabel")}</Label>
          <textarea
            id={`descriptionBn-${listing.id}`}
            value={descriptionBn}
            onChange={(event) => {
              setDescriptionBn(event.target.value)
              markDirty()
            }}
            maxLength={5000}
            placeholder={t("descriptionPlaceholder")}
            className={TEXTAREA_CLASS}
          />
        </div>
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
