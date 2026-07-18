"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"

import {
  ASSET_TYPES,
  TRANSACTION_TYPES,
  type GeoCityUpazila,
  type GeoDistrict,
  type GeoDivision,
} from "@bdph/types"
import { getCitiesUpazilas, getDistricts, getDivisions } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CatalogFilterValue } from "./catalog-filters.types"

// Whole BDT, no decimals/commas — matches the listing editor's price input.
const WHOLE_NUMBER = /^\d+$/
// Radix Select rejects an empty-string item value, so "no filter applied" is
// represented by this sentinel and translated back to "" at the boundary.
const ALL_VALUE = "__all__"

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
// District is one flat Select grouped by division: we fetch all Zillas once
// (the editor uses a division→district cascade, but a single grouped list
// keeps the URL to just district_id and reconstructs a shared link without
// extra state). The few-dozen-district list is small enough to render whole.
export function CatalogFilters({ value, onApply }: Props) {
  const t = useTranslations("catalog")
  const locale = useLocale()

  const [q, setQ] = useState(value.q)
  const [districtId, setDistrictId] = useState(value.districtId)
  const [cityUpazilaId, setCityUpazilaId] = useState(value.cityUpazilaId)
  const [assetType, setAssetType] = useState(value.assetType)
  const [transactionType, setTransactionType] = useState(value.transactionType)
  const [priceMin, setPriceMin] = useState(value.priceMin)
  const [priceMax, setPriceMax] = useState(value.priceMax)
  const [error, setError] = useState<string | null>(null)

  const [divisions, setDivisions] = useState<GeoDivision[]>([])
  const [districts, setDistricts] = useState<GeoDistrict[]>([])
  const [citiesUpazilas, setCitiesUpazilas] = useState<GeoCityUpazila[]>([])
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

  // The city/upazila drill-down cascades off the selected district; the full list
  // is large, so it's only fetched once a district is chosen. Clearing the district
  // clears the drill-down list too.
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
    setQ(value.q)
    setDistrictId(value.districtId)
    setCityUpazilaId(value.cityUpazilaId)
    setAssetType(value.assetType)
    setTransactionType(value.transactionType)
    setPriceMin(value.priceMin)
    setPriceMax(value.priceMax)
  }, [
    value.q,
    value.districtId,
    value.cityUpazilaId,
    value.assetType,
    value.transactionType,
    value.priceMin,
    value.priceMax,
  ])

  // Changing the district invalidates any drill-down under the old one.
  function handleDistrictChange(next: string) {
    setDistrictId(next)
    setCityUpazilaId("")
  }

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
    value.q !== "" ||
    value.districtId !== "" ||
    value.cityUpazilaId !== "" ||
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
    // Sort isn't part of this form — preserve the active order. A drill-down only
    // rides along when a district is actually selected.
    onApply({
      q: q.trim(),
      districtId,
      cityUpazilaId: districtId ? cityUpazilaId : "",
      assetType,
      transactionType,
      priceMin: min,
      priceMax: max,
      sort: value.sort,
    })
  }

  function handleClear() {
    setError(null)
    onApply({
      q: "",
      districtId: "",
      cityUpazilaId: "",
      assetType: "",
      transactionType: "",
      priceMin: "",
      priceMax: "",
      sort: value.sort,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border border-border/60 bg-muted/30 p-4"
      aria-label={t("filters.title")}
    >
      <div className="mb-4 grid gap-1.5">
        <Label htmlFor="filter-search">{t("filters.search")}</Label>
        <Input
          id="filter-search"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          maxLength={80}
          className="h-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-district">{t("filters.district")}</Label>
          <Select
            value={districtId || ALL_VALUE}
            onValueChange={(next) => handleDistrictChange(next === ALL_VALUE ? "" : next)}
            disabled={geoError}
          >
            <SelectTrigger id="filter-district" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.all")}</SelectItem>
              {districtGroups.map((group) => (
                <SelectGroup key={group.division.id}>
                  <SelectLabel>
                    {locale === "bn" ? group.division.nameBn : group.division.nameEn}
                  </SelectLabel>
                  {group.districts.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {locale === "bn" ? district.nameBn : district.nameEn}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-city-upazila">{t("filters.cityUpazila")}</Label>
          <Select
            value={cityUpazilaId || ALL_VALUE}
            onValueChange={(next) => setCityUpazilaId(next === ALL_VALUE ? "" : next)}
            disabled={geoError || !districtId}
          >
            <SelectTrigger id="filter-city-upazila" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.all")}</SelectItem>
              {citiesUpazilas.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {locale === "bn" ? row.nameBn : row.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-transaction-type">{t("filters.transactionType")}</Label>
          <Select
            value={transactionType || ALL_VALUE}
            onValueChange={(next) =>
              setTransactionType((next === ALL_VALUE ? "" : next) as typeof transactionType)
            }
          >
            <SelectTrigger id="filter-transaction-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.all")}</SelectItem>
              {TRANSACTION_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`transactionTypes.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-asset-type">{t("filters.assetType")}</Label>
          <Select
            value={assetType || ALL_VALUE}
            onValueChange={(next) =>
              setAssetType((next === ALL_VALUE ? "" : next) as typeof assetType)
            }
          >
            <SelectTrigger id="filter-asset-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.all")}</SelectItem>
              {ASSET_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`assetTypes.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
