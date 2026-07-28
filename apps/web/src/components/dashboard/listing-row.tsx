"use client"

import { useRef, useState, useTransition, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Eye, LoaderCircle } from "lucide-react"

import { toast } from "sonner"

import { type ListingPublicationStatus, type PublicListing } from "@bdph/types"
import { ApiError, submitListingForReview } from "@/lib/api"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListingPhotos } from "./listing-photos"
import { ListingEditor, type ListingEditorSave } from "./listing-editor"
import { ListingPinEditor } from "./listing-pin-editor"
import { ListingDetailsEditor, type ListingDetailsSave } from "./listing-details-editor"
import { ListingStatusHistory } from "./listing-status-history"
import { ListingWithdraw } from "./listing-withdraw"
import { ListingRestore } from "./listing-restore"
import { locationLabel, priceLabel } from "@/lib/listing-display"

const SUBMITTABLE_STATUSES = ["draft", "rejected"] as const
// A seller can withdraw a listing that's in flight or live, but not a bare draft
// (nothing public to pull yet — that's the editor's job) or one already archived.
const WITHDRAWABLE_STATUSES = ["pending_review", "approved", "rejected"] as const

type SectionT = ReturnType<typeof useTranslations>

// Lives in its own file because two routes render it. /dashboard/drafts shows
// the drafts and /dashboard/listings shows everything submitted — same row, same
// editors on both, so a draft is edited exactly the way it always was and a
// rejected listing can still be fixed and resubmitted. The dashboard itself
// renders neither; it counts them and links out.
export function statusVariant(
  status: ListingPublicationStatus,
): "default" | "outline" | "destructive" | "secondary" {
  if (status === "approved") return "default"
  if (status === "rejected" || status === "archived" || status === "removed") return "destructive"
  if (status === "pending_review") return "secondary"
  return "outline"
}

export function ListingRow({
  listing,
  kycVerified,
  onUpdated,
  onSubmitted,
  t,
  action,
  collapsed = false,
}: {
  listing: PublicListing
  kycVerified: boolean
  onUpdated: (updated: PublicListing) => void
  // Fired only after the API has accepted a submit. Navigation is deliberately
  // NOT done here: this row renders on two routes that want to go to different
  // places afterwards, and a component that both edits and redirects is one that
  // can't be reused. The page decides.
  onSubmitted?: (updated: PublicListing) => void
  t: SectionT
  // Optional control rendered beside the status badge. The drafts page puts its
  // Delete button here so the delete stays owned by the page that can refetch
  // after it, rather than this row growing a second reason to exist.
  action?: ReactNode
  // Header + one-line summary only. The listings page tiles many of these as
  // cards, and each expanded row carries a photo gallery, a status history fetch
  // and (for a rejected listing) the full editor — so they open one at a time,
  // on demand, rather than all at once behind a scrollbar.
  collapsed?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Owned here, set by ListingEditor, so the relocated Save button can reflect
  // a save that is running inside a form it no longer contains.
  const [isSaving, setIsSaving] = useState(false)
  // Unique per listing: several rows render at once and `form`/`id` pairing is
  // document-global.
  const editorFormId = `listing-editor-${listing.id}`
  // Handles the two editors publish so Submit can flush their fields first.
  const saveLocation = useRef<ListingEditorSave | null>(null)
  const saveDetails = useRef<ListingDetailsSave | null>(null)
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

  // Submit is always clickable. It used to be pre-disabled by a client-side copy
  // of the server's completeness rule, which meant a seller who disagreed with
  // that rule — or hit a case it got wrong — had no way to find out WHY: the
  // button just sat there greyed. Letting the click through makes the API the
  // single source of truth and puts its actual message on screen.
  //
  // This does not weaken anything. The server still enforces both gates on
  // POST /listings/:id/submit: completeness (400, naming the missing fields) and
  // seller verification / FR-S8 (403). Those are unchanged — the only difference
  // is that a seller now reads the real reason instead of guessing at a disabled
  // control.
  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      // Flush the editors before submitting. Both hold their fields in local
      // state and only wrote on their own Save button, so a seller who filled in
      // a district and went straight to Submit was submitting the listing as the
      // database still knew it: with no location. That is where the 400 "Add the
      // listing's location before submitting for review" came from, on a form
      // that plainly showed a district selected.
      //
      // requireLocation makes the location editor refuse early and name the
      // field, rather than saving nothing and letting the server answer with the
      // vaguer message a moment later.
      try {
        await saveLocation.current?.({ requireLocation: true })
        await saveDetails.current?.()
      } catch (saveError) {
        console.error("Submit auto-save error:", saveError)
        const reason = saveError instanceof Error ? saveError.message : t("saveError")
        // Both editors also render this inline next to the offending field, so
        // the toast says plainly that nothing was submitted.
        setError(reason)
        toast.error(t("submitAutoSaveError", { reason }))
        return
      }

      try {
        const updated = await submitListingForReview(listing.id)
        // Order matters: write the new status into the cache BEFORE handing
        // control to the page. The listing is now `pending_review`, so the
        // drafts list stops matching it and this row — with every field the
        // seller just typed — unmounts. That is the reset: there is no stale
        // form left behind to clear, because the form itself is gone.
        onUpdated(updated)
        toast.success(t("submitSuccess"))
        onSubmitted?.(updated)
      } catch (submitError) {
        // Full object, not just the message — the status code and any field
        // detail are what make this inspectable in devtools.
        console.error("Submit for review error:", submitError)
        // ApiError carries the server's own message (e.g. "Add the listing's
        // location and price before submitting for review"), which is far more
        // useful than a generic string, so it wins when present.
        const message =
          submitError instanceof ApiError ? submitError.message : t("submitError")
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          {/* Submit moved out of this header into the action bar at the bottom of
              the right column, beside Save draft. */}
          {canViewLive ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/catalog/${listing.id}`}>
                <Eye className="size-4" />
                {t("viewLive")}
              </Link>
            </Button>
          ) : null}
          {action}
        </div>
      </div>
      {/* The "add a location before you can submit" hint is gone with the
          disabled state that produced it. The verification note stays: it is not
          about an unfilled field, it points at an account step the seller has to
          complete elsewhere, and it links to that section. */}
      {canSubmit && !kycVerified ? (
        <p className="text-xs text-muted-foreground">{t("submitNeedsVerification")}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {collapsed ? (
        // Enough to tell one card from another at a glance — the rest is behind
        // "Show more".
        <ListingSummary listing={listing} />
      ) : canSubmit ? (
        // Two columns from lg up, one below. Left carries the written detail
        // (location, price, property attributes); right carries the visual work
        // (map pin, photos) and ends in the action bar, so the buttons sit
        // directly under Photos as the last thing in the flow.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ListingEditor
              listing={listing}
              onUpdated={onUpdated}
              t={t}
              formId={editorFormId}
              onSavingChange={setIsSaving}
              saveRef={saveLocation}
            />
            <ListingDetailsEditor
              listing={listing}
              onUpdated={onUpdated}
              t={t}
              saveRef={saveDetails}
            />
          </div>

          <div className="flex flex-col gap-4">
            <ListingPinEditor listing={listing} onUpdated={onUpdated} t={t} />
            <ListingPhotos listing={listing} onUpdated={onUpdated} />

            <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
              {/* `form` binds this back to ListingEditor's <form> so it submits
                  the location & price fields from outside their own subtree. */}
              <Button type="submit" form={editorFormId} size="sm" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {isSaving ? t("saving") : t("saveCta")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {isPending ? t("submitting") : t("submitCta")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ListingSummary listing={listing} />
          <ListingPhotos listing={listing} onUpdated={onUpdated} />
        </>
      )}
      {/* Drafts have no transitions yet — only show the trail once a listing has
          moved through review (pending/approved/rejected/archived). Skipped
          while collapsed because it costs a request per row, and a grid of
          twelve cards would fire twelve of them to render nothing visible. */}
      {!collapsed && listing.publicationStatus !== "draft" ? (
        <ListingStatusHistory listingId={listing.id} />
      ) : null}
      {!collapsed && canWithdraw ? (
        <ListingWithdraw listing={listing} onUpdated={onUpdated} t={t} />
      ) : null}
      {!collapsed && canRestore ? (
        <ListingRestore listing={listing} onUpdated={onUpdated} t={t} />
      ) : null}
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
