"use client"

import { useTranslations } from "next-intl"
import { X } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SavedListings } from "@/hooks/use-saved-listings"
import { ListingPreview } from "./listing-preview"

type Props = {
  listing: PublicListing | null
  saved: SavedListings
  backQuery: string
  open: boolean
  onOpenChange: (next: boolean) => void
}

// Quick-view overlay for a catalog card: the same summary the right rail used to
// show, now in a modal so it works at every breakpoint instead of only where a
// third column fits. The body is <ListingPreview> verbatim rather than a second
// copy of that markup, so the two can't drift.
//
// The card behind it stays a real link to /catalog/[id] — this only intercepts a
// plain left-click, so modifier-click, keyboard activation, and no-JS still
// navigate. "View details" inside the modal is that same link.
export function ListingQuickView({ listing, saved, backQuery, open, onOpenChange }: Props) {
  const t = useTranslations("catalog")

  return (
    <Dialog open={open && Boolean(listing)} onOpenChange={onOpenChange}>
      <DialogContent
        // The scrim: darker and blurred, so the grid behind reads as out of
        // focus. Uses the supports-* variant to match the base overlay's
        // progressive enhancement AND to beat its `backdrop-blur-xs` — an
        // unprefixed utility wouldn't merge against a prefixed one and both
        // would land in the class list.
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-md"
        // Transparent + unpadded: ListingPreview brings its own card surface,
        // so the dialog is just the positioner.
        className="max-w-[calc(100%-2rem)] border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-lg"
        // Own close button — the default ghost one would sit on the cover photo
        // with nothing behind it to guarantee contrast.
        showCloseButton={false}
        // The preview carries no prose description; without this Radix warns
        // about a missing aria-describedby target.
        aria-describedby={undefined}
      >
        {/* Radix requires a title for the dialog's accessible name. The visible
            heading lives inside ListingPreview, so this one is screen-reader
            only to avoid announcing the listing twice. */}
        <DialogTitle className="sr-only">{t("previewHeading")}</DialogTitle>

        {listing ? (
          <ListingPreview listing={listing} saved={saved} backQuery={backQuery} />
        ) : null}

        <DialogClose
          className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/55 text-white outline-none transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white"
          aria-label={t("closePreview")}
        >
          <X className="size-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
