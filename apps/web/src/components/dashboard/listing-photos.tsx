"use client"

import { useRef, useState, useTransition, type ChangeEvent } from "react"
import { useTranslations } from "next-intl"
import { ImagePlus, LoaderCircle } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { ApiError, commitListingMedia, getListingUploadTicket } from "@/lib/api"
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
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-md border border-border/60 bg-muted"
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
            </li>
          ))}
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
