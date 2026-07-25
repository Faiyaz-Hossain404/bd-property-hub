"use client"

import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

// Compact search box in the header. The catalog owns the real search + facet
// state via the URL, so this is just a fast entry point that hands off to
// /catalog?q=… (mirroring the 80-char cap the API and catalog enforce).
export function HeaderSearch({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const t = useTranslations("nav")
  const router = useRouter()
  const [value, setValue] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = value.trim().slice(0, 80)
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog")
    onNavigate?.()
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("search")}
        maxLength={80}
        className="h-9 w-full rounded-full border border-border bg-muted/60 pr-3 pl-9 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:bg-muted focus-visible:border-ring focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </form>
  )
}
