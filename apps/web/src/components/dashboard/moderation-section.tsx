"use client"

import { useEffect, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import type { PublicListing } from "@bdph/types"
import { ApiError, approveListing, getModerationQueue, rejectListing } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SectionT = ReturnType<typeof useTranslations>

export function ModerationSection() {
  const t = useTranslations("dashboard.moderation")
  const [queue, setQueue] = useState<PublicListing[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    getModerationQueue()
      .then((data) => {
        if (active) setQueue(data)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [])

  function removeFromQueue(id: string) {
    setQueue((prev) => prev?.filter((item) => item.id !== id) ?? null)
  }

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="font-heading text-xl font-semibold text-foreground">{t("sectionTitle")}</h2>
      <Card className="mt-4 gap-0 p-0">
        <CardHeader className="border-b px-6 py-5">
          <CardTitle className="text-lg">{t("queueTitle")}</CardTitle>
          <CardDescription>{t("queueDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 px-6 py-2">
          {queue === null && !loadError ? (
            <p className="py-4 text-sm text-muted-foreground">{t("loading")}</p>
          ) : null}
          {loadError ? <p className="py-4 text-sm text-destructive">{t("loadError")}</p> : null}
          {queue !== null && queue.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
          ) : null}
          {queue?.map((listing) => (
            <ModerationRow key={listing.id} listing={listing} onResolved={removeFromQueue} t={t} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ModerationRow({
  listing,
  onResolved,
  t,
}: {
  listing: PublicListing
  onResolved: (id: string) => void
  t: SectionT
}) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runAction(action: () => Promise<unknown>, fallbackMessage: string) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        onResolved(listing.id)
      } catch (caughtError) {
        setError(caughtError instanceof ApiError ? caughtError.message : fallbackMessage)
      }
    })
  }

  function handleApprove() {
    runAction(() => approveListing(listing.id), t("approveError"))
  }

  function handleReject() {
    const trimmed = reason.trim()
    if (trimmed.length === 0) {
      setError(t("reasonRequired"))
      return
    }
    runAction(() => rejectListing(listing.id, { reason: trimmed }), t("rejectError"))
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div>
        <p className="font-medium text-foreground">{listing.titleEn}</p>
        <p className="text-xs text-muted-foreground">
          {t(`assetTypes.${listing.assetType}`)} · {t(`transactionTypes.${listing.transactionType}`)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("reasonPlaceholder")}
          disabled={isPending}
          className="h-8 max-w-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleReject} disabled={isPending}>
          {t("rejectCta")}
        </Button>
        <Button type="button" size="sm" onClick={handleApprove} disabled={isPending}>
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {t("approveCta")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
