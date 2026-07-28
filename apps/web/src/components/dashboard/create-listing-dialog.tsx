"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { LoaderCircle, Plus } from "lucide-react"

import {
  ASSET_TYPES,
  TRANSACTION_TYPES,
  type AssetType,
  type PublicListing,
  type TransactionType,
} from "@bdph/types"
import { ApiError, createListingDraft } from "@/lib/api"
import { useRouter } from "@/i18n/navigation"
import { MY_LISTINGS_QUERY_KEY } from "@/hooks/use-my-listings"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// The blanks a fresh listing starts from. Named because three places need to
// agree on them: the initial state, the reset after a successful create, and the
// reset when the dialog is dismissed.
const DEFAULT_ASSET_TYPE: AssetType = "apartment"
const DEFAULT_TRANSACTION_TYPE: TransactionType = "sale"

type SectionT = ReturnType<typeof useTranslations>

// The create form now lives behind a button instead of sitting open on the
// dashboard. It was the first thing on the page whether or not the seller had
// come to create anything, and it pushed the actual state of their account
// below the fold. As a dialog it costs one click and gives the form the focus
// trap and Escape-to-dismiss it never had inline.
export function CreateListingDialog({ t }: { t: SectionT }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [titleEn, setTitleEn] = useState("")
  const [assetType, setAssetType] = useState<AssetType>(DEFAULT_ASSET_TYPE)
  const [transactionType, setTransactionType] = useState<TransactionType>(DEFAULT_TRANSACTION_TYPE)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Every field back to blank, not just the title. The old inline form cleared
  // `titleEn` alone, so a seller who had just listed a warehouse for rent got
  // "warehouse / rent" pre-filled on their next one — a default that looks
  // deliberate and is easy to submit without re-reading.
  function reset() {
    setTitleEn("")
    setAssetType(DEFAULT_ASSET_TYPE)
    setTransactionType(DEFAULT_TRANSACTION_TYPE)
    setTitleError(null)
    setCreateError(null)
  }

  function handleOpenChange(next: boolean) {
    // A create is a single short request; letting the dialog close mid-flight
    // would leave the seller with no idea whether it landed.
    if (isPending) return
    setOpen(next)
    if (!next) reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)

    const trimmed = titleEn.trim()
    if (trimmed.length === 0) {
      setTitleError(t("titleRequired"))
      return
    }
    setTitleError(null)

    startTransition(async () => {
      try {
        const created = await createListingDraft({ titleEn: trimmed, assetType, transactionType })
        // Seed the shared cache so the dashboard's draft count is right the
        // moment we navigate, rather than after a refetch lands.
        queryClient.setQueryData<PublicListing[]>(MY_LISTINGS_QUERY_KEY, (prev) =>
          prev ? [created, ...prev] : [created],
        )
        reset()
        setOpen(false)
        // The new draft is empty; the drafts page is where it gets filled in.
        router.push("/dashboard/drafts")
      } catch (error) {
        setCreateError(error instanceof ApiError ? error.message : t("createError"))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="size-4" />
          {t("createCta")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {createError ? (
            <p role="alert" className="text-sm text-destructive">
              {createError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="titleEn">{t("titleLabel")}</Label>
            <Input
              id="titleEn"
              value={titleEn}
              onChange={(event) => setTitleEn(event.target.value)}
              placeholder={t("titlePlaceholder")}
              aria-invalid={Boolean(titleError)}
            />
            {titleError ? (
              <p role="alert" className="text-sm text-destructive">
                {titleError}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="assetType">{t("assetTypeLabel")}</Label>
              <Select value={assetType} onValueChange={(value) => setAssetType(value as AssetType)}>
                <SelectTrigger id="assetType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`assetTypes.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-2">
              <Label htmlFor="transactionType">{t("transactionTypeLabel")}</Label>
              <Select
                value={transactionType}
                onValueChange={(value) => setTransactionType(value as TransactionType)}
              >
                <SelectTrigger id="transactionType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`transactionTypes.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {t("createCancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {isPending ? t("creating") : t("createConfirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
