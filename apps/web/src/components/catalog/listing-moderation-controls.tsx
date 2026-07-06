"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, LoaderCircle, ShieldAlert } from "lucide-react"

import { takedownListingInputSchema } from "@bdph/types"
import { ApiError, takedownListing } from "@/lib/api"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const STAFF_ROLES = ["admin", "super_admin"] as const

// Staff-only takedown panel on the public listing detail page (MOD-3). This is
// where staff encounter a live listing to pull down — e.g. after a report. It
// renders nothing for anonymous or non-staff visitors, so the buyer-facing page
// is unchanged for everyone else. The API re-checks the role, so hiding the UI is
// convenience, not the access control.
export function ListingModerationControls({ listingId }: { listingId: string }) {
  const t = useTranslations("catalog.admin")
  const current = useCurrentUser()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isStaff =
    current.status === "authenticated" &&
    current.user.roles.some((role) => STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]))
  if (!isStaff) return null

  function handleConfirm() {
    const trimmed = reason.trim()
    const parsed = takedownListingInputSchema.safeParse({ reason: trimmed })
    if (!parsed.success) {
      setError(t("reasonRequired"))
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await takedownListing(listingId, { reason: parsed.data.reason })
        setRemoved(true)
      } catch (caughtError) {
        setError(caughtError instanceof ApiError ? caughtError.message : t("takedownError"))
      }
    })
  }

  if (removed) {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {t("removedConfirmation")}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="size-4 shrink-0 text-clay" />
        {t("panelTitle")}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("panelDescription")}</p>

      {isOpen ? (
        <div className="mt-3 flex flex-col gap-2">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reasonPlaceholder")}
            disabled={isPending}
            aria-invalid={Boolean(error)}
            className="h-9"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {t("confirmCta")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                setError(null)
              }}
              disabled={isPending}
            >
              {t("cancelCta")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => setIsOpen(true)}
        >
          {t("takedownCta")}
        </Button>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
