"use client"

import { useLocale } from "next-intl"

import { usePathname, useRouter } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"

// Switches locale while keeping the user on the current route (URL-as-state),
// so toggling language on /login stays on /login.
export function LocaleSwitch() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const other: Locale = locale === "bn" ? "en" : "bn"
  const label = other === "bn" ? "বাংলা" : "English"

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => router.replace(pathname, { locale: other })}
    >
      {label}
    </Button>
  )
}
