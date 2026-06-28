"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ImageOff } from "lucide-react"

import type { PublicListingMedia } from "@bdph/types"
import { cn } from "@/lib/utils"

type Props = { photos: PublicListingMedia[] }

// Listing photo gallery: a large active image plus a clickable thumbnail strip.
// Photos arrive pre-ordered by position from the caller.
export function ListingGallery({ photos }: Props) {
  const t = useTranslations("catalog")
  const [activeIndex, setActiveIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
        <ImageOff className="size-8" />
        <span className="text-sm">{t("noPhotos")}</span>
      </div>
    )
  }

  const safeIndex = activeIndex < photos.length ? activeIndex : 0
  const active = photos[safeIndex]
  if (!active) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        <img
          src={active.url}
          alt=""
          width={active.width ?? 1024}
          height={active.height ?? 768}
          className="h-full w-full object-cover"
        />
      </div>
      {photos.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-current={index === safeIndex}
                className={cn(
                  "aspect-square w-full overflow-hidden rounded-lg ring-1 ring-foreground/10 transition",
                  index === safeIndex ? "ring-2 ring-clay" : "hover:ring-foreground/30",
                )}
              >
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
