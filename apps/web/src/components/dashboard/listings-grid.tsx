"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp, FilePlus2 } from "lucide-react"
import { canSubmitListings, type PublicListing, type PublicUser } from "@bdph/types"

import { cn } from "@/lib/utils"
import { Link, useRouter } from "@/i18n/navigation"
import { MY_LISTINGS_QUERY_KEY, submittedOf, useMyListings } from "@/hooks/use-my-listings"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ListingRow } from "./listing-row"

// Everything the seller has submitted at least once: pending_review, approved,
// rejected, archived, removed. Drafts have their own route.
//
// Cards are collapsed by default and open one at a time on "Show more". An
// expanded card carries a photo gallery, a status-history request and — for a
// rejected listing — the full editor, so opening all of them at once is what the
// dashboard used to do and exactly what this route exists to stop.
export function ListingsGrid({ user }: { user: PublicUser }) {
  const t = useTranslations("dashboard.myListings")
  // The row's own labels (statuses, editors, photos, withdraw) live under the
  // listings namespace, so it gets that translator rather than this page's.
  const tListings = useTranslations("dashboard.listings")
  const queryClient = useQueryClient()
  const router = useRouter()

  const kycVerified = canSubmitListings(user.kycStatus)

  // Which cards are open, by id. A Set rather than a single id because a seller
  // comparing two listings should be able to hold both open.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const { data: listings, isPending, isError } = useMyListings()

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // An edit inside a row returns the refreshed listing; write it straight into
  // the cache instead of refetching the whole list, so saving one field doesn't
  // remount every other row's editor and lose their in-progress input.
  function handleUpdated(updated: PublicListing) {
    queryClient.setQueryData<PublicListing[]>(MY_LISTINGS_QUERY_KEY, (prev) =>
      prev?.map((item) => (item.id === updated.id ? updated : item)),
    )
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
      <div
        role="status"
        aria-busy="true"
        className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  const submitted = submittedOf(listings)

  if (submitted.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <FilePlus2 className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
        <Link
          href="/dashboard/drafts"
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("emptyCta")}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
      {submitted.map((listing) => {
        const isOpen = expanded.has(listing.id)
        return (
          <Card
            key={listing.id}
            className={cn(
              "gap-0 p-0 transition-shadow",
              // An open card breaks the grid and takes the whole row. A photo
              // gallery and a two-column editor do not fit a third of the
              // viewport, and letting it span is what makes "Show more" usable
              // on the same page as the tiles.
              isOpen ? "shadow-md md:col-span-2 xl:col-span-3" : "hover:shadow-sm",
            )}
          >
            <div className="px-5 py-4">
              <ListingRow
                listing={listing}
                kycVerified={kycVerified}
                onUpdated={handleUpdated}
                // A rejected listing is submittable, so this page can submit
                // too. It ends on the dashboard for the same reason the drafts
                // page does — one place to land after handing work to review.
                onSubmitted={() => router.push("/dashboard")}
                t={tListings}
                collapsed={!isOpen}
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggle(listing.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                    {isOpen ? t("showLess") : t("showMore")}
                  </Button>
                }
              />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
