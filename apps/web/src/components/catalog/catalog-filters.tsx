"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"

import { ASSET_TYPES, TRANSACTION_TYPES, type GeoDistrict, type GeoDivision } from "@bdph/types"
import { getDistricts, getDivisions } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CatalogFilterValue } from "./catalog-filters.types"

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
// Whole BDT, no decimals/commas — matches the listing editor's price input.
const WHOLE_NUMBER = /^\d+$/

type Props = {
  value: CatalogFilterValue
  onApply: (next: CatalogFilterValue) => void
}

type DivisionGroup = { division: GeoDivision; districts: GeoDistrict[] }

// Public catalog facet bar (FR-B1): district (DISC-3), asset type, transaction
// type, and an inclusive whole-BDT price range. Holds its own draft state so
// typing doesn't refetch on every keystroke; committing on submit hands the parsed
// value up to the parent, which persists it to the URL. Re-syncs from `value` when
// the URL changes elsewhere (e.g. browser back), so the controls always reflect
// the active query.
//
// District is one flat <select> grouped by division via <optgroup>: we fetch all
// Zillas once (the editor uses a division→district cascade, but a single grouped
// list keeps the URL to just district_id and reconstructs a shared link without
// extra state). The few-dozen-district list is small enough to render whole.
export function CatalogFilters({ value, onApply }: Props) {
  const t = useTranslations("catalog")
  const locale = useLocale()

  const [districtId, setDistrictId] = useState(value.districtId)
  const [assetType, setAssetType] = useState(value.assetType)
  const [transactionType, setTransactionType] = useState(value.transactionType)
  const [priceMin, setPriceMin] = useState(value.priceMin)
  const [priceMax, setPriceMax] = useState(value.priceMax)
  const [error, setError] = useState<string | null>(null)

  const [divisions, setDivisions] = useState<GeoDivision[]>([])
  const [districts, setDistricts] = useState<GeoDistrict[]>([])
  const [geoError, setGeoError] = useState(false)

  // Geography is reference data — fetch divisions (for the group labels) and the
  // full district list once.
  useEffect(() => {
    let active = true
    Promise.all([getDivisions(), getDistricts()])
      .then(([divisionList, districtList]) => {
        if (!active) return
        setDivisions(divisionList)
        setDistricts(districtList)
      })
      .catch(() => {
        if (active) setGeoError(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setDistrictId(value.districtId)
    setAssetType(value.assetType)
    setTransactionType(value.transactionType)
    setPriceMin(value.priceMin)
    setPriceMax(value.priceMax)
  }, [value.districtId, value.assetType, value.transactionType, value.priceMin, value.priceMax])

  // Districts grouped under their division, divisions kept in their API order.
  const districtGroups = useMemo<DivisionGroup[]>(() => {
    const byDivision = new Map<string, GeoDistrict[]>()
    for (const district of districts) {
      const group = byDivision.get(district.divisionId)
      if (group) group.push(district)
      else byDivision.set(district.divisionId, [district])
    }
    return divisions
      .map((division) => ({ division, districts: byDivision.get(division.id) ?? [] }))
      .filter((group) => group.districts.length > 0)
  }, [divisions, districts])

  const hasActiveFilter =
    value.districtId !== "" ||
    value.assetType !== "" ||
    value.transactionType !== "" ||
    value.priceMin !== "" ||
    value.priceMax !== ""

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const min = priceMin.trim()
    const max = priceMax.trim()
    if ((min && !WHOLE_NUMBER.test(min)) || (max && !WHOLE_NUMBER.test(max))) {
      setError(t("filters.priceError"))
      return
    }
    if (min && max && Number(min) > Number(max)) {
      setError(t("filters.rangeError"))
      return
    }
    setError(null)
    onApply({ districtId, assetType, transactionType, priceMin: min, priceMax: max })
  }

  function handleClear() {
    setError(null)
    onApply({ districtId: "", assetType: "", transactionType: "", priceMin: "", priceMax: "" })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border border-border/60 bg-muted/30 p-4"
      aria-label={t("filters.title")}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-district">{t("filters.district")}</Label>
          <select
            id="filter-district"
            value={districtId}
            onChange={(event) => setDistrictId(event.target.value)}
            disabled={geoError}
            className={SELECT_CLASS}
          >
            <option value="">{t("filters.all")}</option>
            {districtGroups.map((group) => (
              <optgroup
                key={group.division.id}
                label={locale === "bn" ? group.division.nameBn : group.division.nameEn}
              >
                {group.districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {locale === "bn" ? district.nameBn : district.nameEn}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-transaction-type">{t("filters.transactionType")}</Label>
          <select
            id="filter-transaction-type"
            value={transactionType}
            onChange={(event) => setTransactionType(event.target.value as typeof transactionType)}
            className={SELECT_CLASS}
          >
            <option value="">{t("filters.all")}</option>
            {TRANSACTION_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`transactionTypes.${option}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-asset-type">{t("filters.assetType")}</Label>
          <select
            id="filter-asset-type"
            value={assetType}
            onChange={(event) => setAssetType(event.target.value as typeof assetType)}
            className={SELECT_CLASS}
          >
            <option value="">{t("filters.all")}</option>
            {ASSET_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`assetTypes.${option}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-price-min">{t("filters.priceMin")}</Label>
          <Input
            id="filter-price-min"
            inputMode="numeric"
            value={priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
            placeholder={t("filters.pricePlaceholder")}
            className="h-9"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-price-max">{t("filters.priceMax")}</Label>
          <Input
            id="filter-price-max"
            inputMode="numeric"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            placeholder={t("filters.pricePlaceholder")}
            className="h-9"
          />
        </div>
      </div>

      {geoError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t("filters.geoError")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm">
          {t("filters.apply")}
        </Button>
        {hasActiveFilter ? (
          <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
            {t("filters.clear")}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
