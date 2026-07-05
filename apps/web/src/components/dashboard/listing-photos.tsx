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

  const photos = listing.media
  const atLimit = photos.length >= MAX_PHOTOS
  const orderIds = photos.map((photo) => photo.id)

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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so picking the same file again still fires onChange.
    event.target.value = ""
    if (!file) return
    setError(null)

    // Some browsers report an empty type for HEIC — only reject a known-bad type
    // and let the server make the final call.
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      setError(t("photos.wrongType"))
      return
    }
    if (file.size > MAX_BYTES) {
      setError(t("photos.tooLarge"))
      return
    }

    startTransition(async () => {
      try {
        const ticket = await getListingUploadTicket(listing.id)
        const uploaded = await uploadImageToCloudinary(ticket, file)
        const updated = await commitListingMedia(listing.id, uploaded)
        onUpdated(updated)
      } catch (uploadError) {
        setError(uploadError instanceof ApiError ? uploadError.message : t("photos.uploadError"))
      }
    })
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
          disabled={isPending || atLimit}
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {isPending ? t("photos.uploading") : t("photos.addCta")}
        </Button>
        <input
          ref={inputRef}
          type="file"
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
                    disabled={isPending || index === 0}
                    onClick={() => handleMove(photo.id, -1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </PhotoControl>
                  <PhotoControl
                    label={t("photos.moveRight")}
                    disabled={isPending || index === photos.length - 1}
                    onClick={() => handleMove(photo.id, 1)}
                  >
                    <ChevronRight className="size-3.5" />
                  </PhotoControl>
                  <PhotoControl
                    label={t("photos.makeCover")}
                    disabled={isPending || isCover}
                    onClick={() => handleMakeCover(photo.id)}
                  >
                    <Star className="size-3.5" />
                  </PhotoControl>
                  <PhotoControl
                    label={t("photos.remove")}
                    disabled={isPending}
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
