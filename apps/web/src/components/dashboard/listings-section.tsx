"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Eye, LoaderCircle } from "lucide-react"

import {
  ASSET_TYPES,
  TRANSACTION_TYPES,
  canSubmitListings,
  listingCompletenessGaps,
  type AssetType,
  type ListingPublicationStatus,
  type PublicListing,
  type PublicUser,
  type TransactionType,
} from "@bdph/types"
import { ApiError, becomeSeller, createListingDraft, getMyListings, submitListingForReview } from "@/lib/api"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ListingPhotos } from "./listing-photos"
import { ListingEditor } from "./listing-editor"
import { ListingPinEditor } from "./listing-pin-editor"
import { ListingDetailsEditor } from "./listing-details-editor"
import { ListingStatusHistory } from "./listing-status-history"
import { ListingWithdraw } from "./listing-withdraw"
import { ListingRestore } from "./listing-restore"
import { locationLabel, priceLabel } from "@/lib/listing-display"

const SELLER_ROLES = ["seller", "admin", "super_admin"] as const
const SUBMITTABLE_STATUSES = ["draft", "rejected"] as const
// A seller can withdraw a listing that's in flight or live, but not a bare draft
// (nothing public to pull yet — that's the editor's job) or one already archived.
const WITHDRAWABLE_STATUSES = ["pending_review", "approved", "rejected"] as const

type SectionT = ReturnType<typeof useTranslations>

type Props = { user: PublicUser; onUserRefresh: () => void }

function statusVariant(status: ListingPublicationStatus): "default" | "outline" | "destructive" | "secondary" {
  if (status === "approved") return "default"
  if (status === "rejected" || status === "archived" || status === "removed") return "destructive"
  if (status === "pending_review") return "secondary"
  return "outline"
}

export function ListingsSection({ user, onUserRefresh }: Props) {
  const t = useTranslations("dashboard.listings")
  const isSeller = user.roles.some((role) =>
    SELLER_ROLES.includes(role as (typeof SELLER_ROLES)[number]),
  )
  // Mirrors the server's submit gate (FR-S8) so Submit is disabled with a hint
  // rather than failing the click; the API still enforces it.
  const kycVerified = canSubmitListings(user.kycStatus)

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="font-heading text-xl font-semibold text-foreground">{t("sectionTitle")}</h2>
      {isSeller ? (
        <DraftWorkspace t={t} kycVerified={kycVerified} />
      ) : (
        <BecomeSellerCard onUserRefresh={onUserRefresh} t={t} />
      )}
    </div>
  )
}

function BecomeSellerCard({ onUserRefresh, t }: { onUserRefresh: () => void; t: SectionT }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await becomeSeller()
        onUserRefresh()
      } catch {
        setError(t("becomeSellerError"))
      }
    })
  }

  return (
    <Card className="mt-4 gap-0 p-0">
      <CardHeader className="border-b px-6 py-5">
        <CardTitle className="text-lg">{t("becomeSellerTitle")}</CardTitle>
        <CardDescription>{t("becomeSellerBody")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-6 py-5">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={handleClick} disabled={isPending} className="w-fit">
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending ? t("becomingSeller") : t("becomeSellerCta")}
        </Button>
      </CardContent>
    </Card>
  )
}

function DraftWorkspace({ t, kycVerified }: { t: SectionT; kycVerified: boolean }) {
  const [listings, setListings] = useState<PublicListing[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [titleEn, setTitleEn] = useState("")
  const [assetType, setAssetType] = useState<AssetType>("apartment")
  const [transactionType, setTransactionType] = useState<TransactionType>("sale")
  const [titleError, setTitleError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    getMyListings()
      .then((data) => {
        if (active) setListings(data)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [])

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
        setListings((prev) => [created, ...(prev ?? [])])
        setTitleEn("")
      } catch (error) {
        setCreateError(error instanceof ApiError ? error.message : t("createError"))
      }
    })
  }

  return (
    <Card className="mt-4 gap-0 p-0">
      <CardHeader className="border-b px-6 py-5">
        <CardTitle className="text-lg">{t("createTitle")}</CardTitle>
        <CardDescription>{t("createDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-5">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
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

            <div className="grid gap-2">
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

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? t("creating") : t("createCta")}
          </Button>
        </form>

        <div className="mt-6 divide-y divide-border/60 border-t">
          {listings === null && !loadError ? (
            <p className="py-4 text-sm text-muted-foreground">{t("loading")}</p>
          ) : null}
          {loadError ? <p className="py-4 text-sm text-destructive">{t("loadError")}</p> : null}
          {listings !== null && listings.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
          ) : null}
          {listings?.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              kycVerified={kycVerified}
              onUpdated={(updated) =>
                setListings((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? null)
              }
              t={t}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ListingRow({
  listing,
  kycVerified,
  onUpdated,
  t,
}: {
  listing: PublicListing
  kycVerified: boolean
  onUpdated: (updated: PublicListing) => void
  t: SectionT
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canSubmit = SUBMITTABLE_STATUSES.includes(
    listing.publicationStatus as (typeof SUBMITTABLE_STATUSES)[number],
  )
  const canWithdraw = WITHDRAWABLE_STATUSES.includes(
    listing.publicationStatus as (typeof WITHDRAWABLE_STATUSES)[number],
  )
  // Only `approved` listings are publicly reachable (the catalog detail route
  // serves nothing else), so that's the only status we link out to.
  const canViewLive = listing.publicationStatus === "approved"
  // An archived listing can be restored (back to draft) so the seller can edit
  // and resubmit — the mirror of withdraw.
  const canRestore = listing.publicationStatus === "archived"
  // A submittable draft must also be complete (location + price). We mirror the
  // server gate here so Submit is disabled with an explanatory hint instead of
  // letting the click fail — but the API still enforces it (defense in depth).
  const gaps = canSubmit ? listingCompletenessGaps(listing) : []
  const missingLabel = gaps
    .map((requirement) => t(`requirements.${requirement}`))
    .join(t("requirementSeparator"))

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const updated = await submitListingForReview(listing.id)
        onUpdated(updated)
      } catch (submitError) {
        setError(submitError instanceof ApiError ? submitError.message : t("submitError"))
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{listing.titleEn}</p>
          <p className="text-xs text-muted-foreground">
            {t(`assetTypes.${listing.assetType}`)} · {t(`transactionTypes.${listing.transactionType}`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(listing.publicationStatus)}>
            {t(`publicationStatuses.${listing.publicationStatus}`)}
          </Badge>
          {canSubmit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSubmit}
              disabled={isPending || gaps.length > 0 || !kycVerified}
            >
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {isPending ? t("submitting") : t("submitCta")}
            </Button>
          ) : null}
          {canViewLive ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/catalog/${listing.id}`}>
                <Eye className="size-4" />
                {t("viewLive")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {canSubmit && !kycVerified ? (
        <p className="text-xs text-muted-foreground">{t("submitNeedsVerification")}</p>
      ) : canSubmit && gaps.length > 0 ? (
        <p className="text-xs text-muted-foreground">{t("submitIncomplete", { missing: missingLabel })}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {canSubmit ? (
        <>
          <ListingEditor listing={listing} onUpdated={onUpdated} t={t} />
          <ListingPinEditor listing={listing} onUpdated={onUpdated} t={t} />
          <ListingDetailsEditor listing={listing} onUpdated={onUpdated} t={t} />
        </>
      ) : (
        <ListingSummary listing={listing} />
      )}
      <ListingPhotos listing={listing} onUpdated={onUpdated} />
      {/* Drafts have no transitions yet — only show the trail once a listing has
          moved through review (pending/approved/rejected/archived). */}
      {listing.publicationStatus !== "draft" ? (
        <ListingStatusHistory listingId={listing.id} />
      ) : null}
      {canWithdraw ? <ListingWithdraw listing={listing} onUpdated={onUpdated} t={t} /> : null}
      {canRestore ? <ListingRestore listing={listing} onUpdated={onUpdated} t={t} /> : null}
    </div>
  )
}

// Read-only location + price line for listings that are no longer editable
// (pending review / approved / archived). Reuses the catalog display helpers so
// formatting matches the public catalog exactly.
function ListingSummary({ listing }: { listing: PublicListing }) {
  const locale = useLocale()
  const ct = useTranslations("catalog")
  const place = locationLabel(listing.location, locale)
  const price = priceLabel(listing.pricing, locale, ct)

  return (
    <p className="text-xs text-muted-foreground">
      {place ?? ct("locationUnset")} · {price}
    </p>
  )
}
