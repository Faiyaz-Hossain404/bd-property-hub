"use client"

import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"

import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Mirror of the server's q cap (publicListingQuerySchema).
const MAX_SEARCH_LENGTH = 80

// Landing-page search box (DISC-8). Submitting deep-links into the catalog with
// the typed term as ?q=, where the full facet bar takes over; empty input just
// opens the unfiltered catalog. Uses the locale-aware router so the active
// language prefix is preserved.
export function HeroSearch() {
  const t = useTranslations("home")
  const router = useRouter()
  const [q, setQ] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = q.trim()
    router.push(term ? `/catalog?q=${encodeURIComponent(term)}` : "/catalog")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex max-w-xl flex-col gap-3 rounded-xl border bg-card p-3 shadow-lg sm:flex-row sm:items-center"
    >
      <Input
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        maxLength={MAX_SEARCH_LENGTH}
        className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="lg" className="h-12 shrink-0 px-8">
        {t("searchCta")}
      </Button>
    </form>
  )
}
