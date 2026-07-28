"use client"

import { useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import {
  ApiError,
  commitListingMedia,
  getListingUploadTicket,
  removeListingMedia,
  reorderListingMedia,
} from "@/lib/api"
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload"
import { Button } from "@/components/ui/button"

// Mirrors the server caps (FILE_STORAGE_ARCHITECTURE.md / @bdph/types) for fast
// client-side feedback; the API is still the authority and re-checks everything.
const MAX_PHOTOS = 20
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"]

type Props = {
  listing: PublicListing
  onUpdated: (listing: PublicListing) => void
}

export function ListingPhotos({ listing, onUpdated }: Props) {
  const t = useTranslations("dashboard.listings")
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Batch upload progress. Kept out of the transition on purpose: updates inside
  // startTransition are low priority, so a counter driven from in there would
  // lag behind the work it is meant to be reporting.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const photos = listing.media
  const atLimit = photos.length >= MAX_PHOTOS
  const remainingSlots = MAX_PHOTOS - photos.length
  const orderIds = photos.map((photo) => photo.id)
  const isUploading = progress !== null
  // One flag for every control: a reorder must not land mid-batch, and a second
  // batch must not start on top of the first.
  const busy = isPending || isUploading

  // Shared runner for the reorder/remove operations: clears prior errors, awaits
  // the API call, and hands the refreshed listing back to the parent. Any op in
  // flight disables all controls (isPending), so orderings can't race.
  function runPhotoOp(op: () => Promise<PublicListing>) {
    setError(null)
    startTransition(async () => {
      try {
        onUpdated(await op())
      } catch (opError) {
        setError(opError instanceof ApiError ? opError.message : t("photos.updateError"))
      }
    })
  }

  function handleMakeCover(id: string) {
    runPhotoOp(() =>
      reorderListingMedia(listing.id, [id, ...orderIds.filter((other) => other !== id)]),
    )
  }

  function handleMove(id: string, direction: -1 | 1) {
    const index = orderIds.indexOf(id)
    const target = index + direction
    if (index === -1 || target < 0 || target >= orderIds.length) return
    const next = [...orderIds]
    const moved = next[index]!
    next[index] = next[target]!
    next[target] = moved
    runPhotoOp(() => reorderListingMedia(listing.id, next))
  }

  function handleRemove(id: string) {
    runPhotoOp(() => removeListingMedia(listing.id, id))
  }

  // Batch upload. The picker is `multiple`, so this takes anything from one file
  // to the whole remaining allowance in a single pass.
  //
  // Two phases, and the split is deliberate:
  //
  //   1. Cloudinary uploads run CONCURRENTLY (Promise.allSettled). This is the
  //      slow, bandwidth-bound leg, and it is the only part where parallelism
  //      actually buys anything. allSettled rather than all so one bad file
  //      cannot cancel the other nineteen.
  //
  //   2. Commits run SEQUENTIALLY, in the order the files were picked. The
  //      server's commit is already race-safe (an atomic findOneAndUpdate with a
  //      $push), but it stamps `position` from the media length it read BEFORE
  //      the push — so firing commits in parallel lets two photos claim the same
  //      position. Cover is *defined* as position 0, so a collision there makes
  //      the cover ambiguous. Going in order also gives the guarantee we want:
  //      on a listing with no photos yet, the first file the seller picked lands
  //      at position 0 and is therefore the cover. If a cover already exists it
  //      keeps its slot, because these append after it.
  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    // Reset so picking the same files again still fires onChange.
    event.target.value = ""
    if (picked.length === 0) return
    setError(null)

    // Trim to what still fits under the cap before validating, so the count of
    // "skipped, no room" is separate from "skipped, bad file".
    const overLimit = Math.max(0, picked.length - remainingSlots)
    const candidates = picked.slice(0, remainingSlots)

    let wrongType = 0
    let tooLarge = 0
    const accepted: File[] = []
    for (const file of candidates) {
      // Some browsers report an empty type for HEIC — only reject a known-bad
      // type and let the server make the final call.
      if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
        wrongType += 1
      } else if (file.size > MAX_BYTES) {
        tooLarge += 1
      } else {
        accepted.push(file)
      }
    }

    const notes: string[] = []
    if (overLimit > 0) notes.push(t("photos.skippedLimit", { count: overLimit }))
    if (wrongType > 0) notes.push(t("photos.skippedType", { count: wrongType }))
    if (tooLarge > 0) notes.push(t("photos.skippedSize", { count: tooLarge }))

    if (accepted.length === 0) {
      setError(notes.join(" "))
      return
    }

    setProgress({ done: 0, total: accepted.length })

    // Phase 1 — bytes to Cloudinary, all at once.
    const uploads = await Promise.allSettled(
      accepted.map(async (file) => {
        const ticket = await getListingUploadTicket(listing.id)
        return uploadImageToCloudinary(ticket, file)
      }),
    )

    // Phase 2 — record them with our API, one at a time, in pick order.
    let latest: PublicListing | null = null
    let failed = 0
    let processed = 0
    for (const result of uploads) {
      if (result.status === "fulfilled") {
        try {
          latest = await commitListingMedia(listing.id, result.value)
        } catch (commitError) {
          console.error("Photo commit error:", commitError)
          failed += 1
        }
      } else {
        console.error("Photo upload error:", result.reason)
        failed += 1
      }
      processed += 1
      setProgress({ done: processed, total: accepted.length })
    }

    // One update at the end: `latest` is the last commit's response, which
    // already contains every photo added in this batch.
    if (latest) onUpdated(latest)
    if (failed > 0) notes.push(t("photos.batchFailed", { count: failed }))
    setError(notes.length > 0 ? notes.join(" ") : null)
    setProgress(null)
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {t("photos.title")} · {t("photos.count", { count: photos.length, max: MAX_PHOTOS })}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy || atLimit}
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {progress
            ? t("photos.uploadingProgress", { done: progress.done, total: progress.total })
            : busy
              ? t("photos.uploading")
              : t("photos.addCta")}
        </Button>
        {/* `multiple` lets the seller pick the whole batch in one pass. The
            accept list is the same one handleChange re-checks, so the picker
            filters and the code still validates — the picker's filter is a
            convenience, not a guarantee. */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, index) => {
            const isCover = index === 0
            return (
              <li
                key={photo.id}
                className="group relative overflow-hidden rounded-md border border-border/60 bg-muted"
              >
                {/* Cloudinary serves an optimized, EXIF-stripped image; a plain img
                    avoids next/image remote-host config for these thumbnails. */}
                <img
                  src={photo.url}
                  alt=""
                  width={photo.width ?? 320}
                  height={photo.height ?? 240}
                  loading="lazy"
                  className="aspect-[4/3] h-auto w-full object-cover"
                />

                {isCover ? (
                  <span className="absolute top-1 left-1 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">
                    {t("photos.cover")}
                  </span>
                ) : null}

                {/* Controls overlay — always available; a light backdrop keeps the
                    icons legible over any photo. */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-foreground/45 p-1">
                  <PhotoControl
                    label={t("photos.moveLeft")}
                    disabled={busy || index === 0}
                    onClick={() => handleMove(photo.id, -1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </PhotoControl>
                  <PhotoControl
                    label={t("photos.moveRight")}
                    disabled={busy || index === photos.length - 1}
                    onClick={() => handleMove(photo.id, 1)}
                  >
                    <ChevronRight className="size-3.5" />
                  </PhotoControl>
                  <PhotoControl
                    label={t("photos.makeCover")}
                    disabled={busy || isCover}
                    onClick={() => handleMakeCover(photo.id)}
                  >
                    <Star className="size-3.5" />
                  </PhotoControl>
                  <PhotoControl
                    label={t("photos.remove")}
                    disabled={busy}
                    onClick={() => handleRemove(photo.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </PhotoControl>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t("photos.empty")}</p>
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

// Small icon button used in the per-photo controls overlay. The visible label is
// icon-only, so the text label drives both the tooltip and the accessible name.
function PhotoControl({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-6 items-center justify-center rounded bg-background/90 text-foreground transition hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
