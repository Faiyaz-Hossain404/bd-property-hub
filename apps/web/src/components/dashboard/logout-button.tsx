"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle, LogOut } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { logoutUser } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const t = useTranslations("dashboard")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      // Logout is best-effort: even if the revoke request fails (network), we
      // still send the user to /login, where the guard re-checks the session.
      try {
        await logoutUser()
      } finally {
        router.replace("/login")
        router.refresh()
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      {isPending ? t("loggingOut") : t("logout")}
    </Button>
  )
}
