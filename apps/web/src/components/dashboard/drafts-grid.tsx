"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { FilePlus2, LoaderCircle, Trash2 } from "lucide-react"
import { canSubmitListings, type PublicListing, type PublicUser } from "@bdph/types"

import { Link, useRouter } from "@/i18n/navigation"
import { ApiError, deleteListing } from "@/lib/api"
import { MY_LISTINGS_QUERY_KEY, draftsOf, useMyListings } from "@/hooks/use-my-listings"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ListingRow } from "./listing-row"

// The drafts route is now the only place a draft is edited — the dashboard is a
// summary and shows no listings at all. So this renders the same ListingRow the
// dashboard used to, rather than a read-only card that would strand
// half-finished work with nowhere to finish it.
export function DraftsGrid({ user }: { user: PublicUser }) {
  const t = useTranslations("dashboard.drafts")
  // The row's own labels (statuses, editors, submit hints) live under the
  // listings namespace, so it gets that translator rather than this page's.
  const tListings = useTranslations("dashboard.listings")
  const queryClient = useQueryClient()
  const router = useRouter()

  // Mirrors the server's submit gate (FR-S8) so Submit is disabled with a hint
  // rather than failing the click; the API still enforces it.
  const kycVerified = canSubmitListings(user.kycStatus)

  // Which draft the confirmation dialog is asking about. Holding the whole
  // listing (not just an id) lets the dialog name it even as the list refetches.
  const [pendingDelete, setPendingDelete] = useState<PublicListing | null>(null)

  const { data: listings, isPending, isError } = useMyListings()

  const remove = useMutation({
    mutationFn: (listing: PublicListing) => deleteListing(listing.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY })
      setPendingDelete(null)
    },
  })

  // An edit inside a row returns the refreshed listing; write it straight into
  // the cache instead of refetching the whole list, so saving one field doesn't
  // remount every other row's editor and lose their in-progress input.
  function handleUpdated(updated: PublicListing) {
    queryClient.setQueryData<PublicListing[]>(MY_LISTINGS_QUERY_KEY, (prev) =>
      prev?.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  // The API is the authority on what may be deleted — it refuses anything that
  // has been through review, even though such a listing can be back in `draft`
  // after a restore. So show its message rather than a generic failure, because
  // "archive it instead" is actionable and "something went wrong" is not.
  const deleteError = remove.isError
    ? remove.error instanceof ApiError
      ? remove.error.message
      : t("deleteError")
    : null

  function closeDialog(open: boolean) {
    if (open || remove.isPending) return
    setPendingDelete(null)
    remove.reset()
  }

  if (isError) {
    return (
      <p role="alert" className="mt-8 text-sm text-destructive">
        {t("loadError")}
      </p>
    )
  }

  if (isPending) {
    return (
      <div role="status" aria-busy="true" className="mt-8 flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const drafts = draftsOf(listings)

  if (drafts.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <FilePlus2 className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("emptyCta")}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mt-8 divide-y divide-border/60 border-t">
        {drafts.map((listing) => (
          <ListingRow
            key={listing.id}
            listing={listing}
            kycVerified={kycVerified}
            onUpdated={handleUpdated}
            // A submitted listing is no longer a draft, so it drops out of this
            // page the instant handleUpdated writes the new status — leaving the
            // seller on a drafts screen that just lost the thing they were
            // working on, with no sign of where it went. Send them back to the
            // dashboard, which counts it under listings and links to it.
            onSubmitted={() => router.push("/dashboard")}
            t={tListings}
            action={
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  remove.reset()
                  setPendingDelete(listing)
                }}
              >
                <Trash2 className="size-4" />
                {t("deleteCta")}
              </Button>
            }
          />
        ))}
      </div>

      {/* One dialog for the whole list rather than one per row — the row only
          decides which listing is being asked about. Deleting photos is
          irreversible, so this always confirms before the request goes out. */}
      <Dialog open={pendingDelete !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteBody", {
                title: pendingDelete?.titleEn || t("untitled"),
              })}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeDialog(false)}
              disabled={remove.isPending}
            >
              {t("deleteCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete)
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
