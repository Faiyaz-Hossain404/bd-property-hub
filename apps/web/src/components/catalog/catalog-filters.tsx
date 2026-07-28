"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"

import { ASSET_TYPES, TRANSACTION_TYPES } from "@bdph/types"
import { getCitiesUpazilas, getDistricts } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
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
  // Lets the mobile drawer drop the card chrome (the drawer already is the
  // surface) without a second copy of the form.
  className?: string
}

type GeoNamed = { nameEn: string; nameBn: string }

// Strict A-Z over the name actually on screen, using the active locale's
// collation — Bangla names order by the Bengali alphabet, not by their UTF-16
// code points, which is what a bare `<` comparison would give. Copies before
// sorting so the cached query arrays are never mutated in place.
function sortByName<T extends GeoNamed>(rows: readonly T[], locale: string): T[] {
  return [...rows].sort((a, b) => {
    const left = locale === "bn" ? a.nameBn : a.nameEn
    const right = locale === "bn" ? b.nameBn : b.nameEn
    return left.localeCompare(right, locale)
  })
}

// Public catalog facet bar (FR-B1): district (DISC-3), asset type, transaction
// type, and an inclusive whole-BDT price range. Holds its own draft state so
// typing doesn't refetch on every keystroke; committing on submit hands the parsed
// value up to the parent, which persists it to the URL. Re-syncs from `value` when
// the URL changes elsewhere (e.g. browser back), so the controls always reflect
// the active query.
//
// District is one flat, strictly A-Z Select: we fetch all 64 Zillas once (the
// editor uses a division→district cascade, but a single flat list keeps the URL
// to just district_id and reconstructs a shared link without extra state). It
// used to be grouped under division headings, which broke the alphabet — a
// reader scanning for "Rangpur" had to know which division it sits in first. The
// few-dozen-district list is small enough to render whole.
export function CatalogFilters({ value, onApply, className }: Props) {
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

  // Geography is immutable reference data, so it goes through the query cache
  // rather than a hand-rolled effect. That matters here specifically: the catalog
  // mounts this form twice below `lg` (the rail and the drawer), and a shared
  // cache means the district list is still fetched exactly once.
  const districtsQuery = useQuery({
    queryKey: ["geo", "districts"],
    queryFn: () => getDistricts(),
    staleTime: Infinity,
  })

  // The city/upazila drill-down cascades off the selected district; the full list
  // is large, so it's only fetched once a district is chosen. With no district the
  // query is disabled and its data is undefined, which empties the drill-down.
  const citiesUpazilasQuery = useQuery({
    queryKey: ["geo", "cities-upazilas", districtId],
    queryFn: () => getCitiesUpazilas(districtId),
    enabled: districtId !== "",
    staleTime: Infinity,
  })

  const geoError = districtsQuery.isError || citiesUpazilasQuery.isError

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

  // One flat run of districts, A-Z. No division headings: the whole point is that
  // the list opens on Bagerhat and ends on Thakurgaon with nothing in between.
  //
  // The `?? []` lives inside the callback on purpose. Hoisting it to a const
  // would mint a fresh array on every render, so the dep would never compare
  // equal and the memo would re-sort all 64 districts each time — the cached
  // query data itself is a stable reference, so depending on it directly is what
  // makes the memo do its job.
  const sortedDistricts = useMemo(
    () => sortByName(districtsQuery.data ?? [], locale),
    [districtsQuery.data, locale],
  )

  const sortedCitiesUpazilas = useMemo(
    () => sortByName(citiesUpazilasQuery.data ?? [], locale),
    [citiesUpazilasQuery.data, locale],
  )

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
      className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}
      aria-label={t("filters.title")}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-foreground">{t("filters.title")}</h2>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded text-xs font-medium text-primary transition-colors outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("filters.clear")}
          </button>
        ) : null}
      </div>

      <div className="grid gap-5">
        <div className="grid gap-1.5">
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

        <div className="grid gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("filters.locationGroup")}
          </p>
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
                {sortedDistricts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {locale === "bn" ? district.nameBn : district.nameEn}
                  </SelectItem>
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
                {sortedCitiesUpazilas.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {locale === "bn" ? row.nameBn : row.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("filters.propertyGroup")}
          </p>
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
        </div>

        <div className="grid gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("filters.priceGroup")}
          </p>
          <div className="grid grid-cols-2 gap-3">
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
        </div>
      </div>

      {geoError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t("filters.geoError")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="sm" className="mt-5 w-full">
        {t("filters.apply")}
      </Button>
    </form>
  )
}
