"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"

import { ASSET_TYPES, TRANSACTION_TYPES } from "@bdph/types"
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

// Public catalog facet bar (FR-B1): asset type, transaction type, and an inclusive
// whole-BDT price range. Holds its own draft state so typing doesn't refetch on
// every keystroke; committing on submit hands the parsed value up to the parent,
// which persists it to the URL. Re-syncs from `value` when the URL changes
// elsewhere (e.g. browser back), so the controls always reflect the active query.
export function CatalogFilters({ value, onApply }: Props) {
  const t = useTranslations("catalog")
  const [assetType, setAssetType] = useState(value.assetType)
  const [transactionType, setTransactionType] = useState(value.transactionType)
  const [priceMin, setPriceMin] = useState(value.priceMin)
  const [priceMax, setPriceMax] = useState(value.priceMax)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAssetType(value.assetType)
    setTransactionType(value.transactionType)
    setPriceMin(value.priceMin)
    setPriceMax(value.priceMax)
  }, [value.assetType, value.transactionType, value.priceMin, value.priceMax])

  const hasActiveFilter =
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
    onApply({ assetType, transactionType, priceMin: min, priceMax: max })
  }

  function handleClear() {
    setError(null)
    onApply({ assetType: "", transactionType: "", priceMin: "", priceMax: "" })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border border-border/60 bg-muted/30 p-4"
      aria-label={t("filters.title")}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
