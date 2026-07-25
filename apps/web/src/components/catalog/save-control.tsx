"use client"

import { useTranslations } from "next-intl"
import { Heart } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { SavedListings } from "@/hooks/use-saved-listings"

type Props = {
  listingId: string
  saved: SavedListings
  variant?: "icon" | "button"
  className?: string
}

// Save/unsave control backed by the shared catalog favourites state (one fetch
// for the whole page, not one per card). `icon` is the floating heart on a
// listing card; `button` is the labelled action in the preview rail. Anonymous
// viewers get a "sign in to save" affordance instead of a live toggle.
export function SaveControl({ listingId, saved, variant = "icon", className }: Props) {
  const t = useTranslations("catalog.save")
  const isSaved = saved.isSaved(listingId)

  if (!saved.isAuthenticated) {
    if (variant === "button") {
      return (
        <Button asChild variant="outline" size="sm" className={cn("w-fit", className)}>
          <Link href="/login">
            <Heart className="size-4" />
            {t("signInToSave")}
          </Link>
        </Button>
      )
    }
    return (
      <Button
        asChild
        variant="secondary"
        size="icon"
        aria-label={t("signInToSave")}
        className={cn(
          "rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-border backdrop-blur hover:bg-card",
          className,
        )}
      >
        <Link href="/login">
          <Heart className="size-4" />
        </Link>
      </Button>
    )
  }

  const label = isSaved ? t("saved") : t("save")

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant={isSaved ? "default" : "outline"}
        size="sm"
        className={cn("w-fit", className)}
        onClick={() => saved.toggle(listingId)}
        aria-pressed={isSaved}
      >
        <Heart className={isSaved ? "size-4 fill-current" : "size-4"} />
        {label}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-pressed={isSaved}
      aria-label={label}
      onClick={() => saved.toggle(listingId)}
      className={cn(
        "rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-border backdrop-blur transition-colors hover:bg-card",
        isSaved && "text-primary hover:text-primary",
        className,
      )}
    >
      <Heart className={isSaved ? "size-4 fill-current" : "size-4"} />
    </Button>
  )
}
