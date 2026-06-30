"use client"

import { useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { ChevronDown, LoaderCircle } from "lucide-react"

import type { PublicListingStatusHistoryEntry } from "@bdph/types"
import { getListingStatusHistory } from "@/lib/api"

type FetchStatus = "idle" | "loading" | "ready" | "error"

// Collapsible moderation trail for a single listing, backed by
// GET /listings/:id/status-history (owner-or-staff, enforced server-side). Sellers
// open it to see how a listing moved through review — submitted → approved/rejected —
// and read the moderator's reason on a rejection. Entries are fetched lazily on first
// open and cached in state; the API returns them oldest-first, so we reverse to show
// the most recent decision at the top.
export function ListingStatusHistory({ listingId }: { listingId: string }) {
  const t = useTranslations("dashboard.listings")
  const format = useFormatter()
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState<PublicListingStatusHistoryEntry[]>([])
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle")

  async function loadHistory() {
    setFetchStatus("loading")
    try {
      const data = await getListingStatusHistory(listingId)
      setEntries([...data].reverse())
      setFetchStatus("ready")
    } catch {
      setFetchStatus("error")
    }
  }

  function handleToggle() {
    const next = !isOpen
    setIsOpen(next)
    // Fetch on first open; once loaded the trail is static for this view.
    if (next && fetchStatus === "idle") void loadHistory()
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
        {t("history.toggle")}
      </button>

      {isOpen ? (
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          {fetchStatus === "loading" ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              {t("history.loading")}
            </p>
          ) : null}

          {fetchStatus === "error" ? (
            <p role="alert" className="flex items-center gap-2 text-xs text-destructive">
              {t("history.loadError")}
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="font-medium underline hover:no-underline"
              >
                {t("history.retry")}
              </button>
            </p>
          ) : null}

          {fetchStatus === "ready" && entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("history.empty")}</p>
          ) : null}

          {fetchStatus === "ready" && entries.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                  <span className="text-xs font-medium text-foreground">
                    {t(`publicationStatuses.${entry.toStatus}`)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(entry.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {entry.reason ? (
                    <span className="mt-0.5 text-xs text-foreground/80">
                      {t("history.reason", { reason: entry.reason })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
