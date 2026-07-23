"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { useClerk } from "@clerk/nextjs"
import { LoaderCircle, LogOut } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { logoutUser } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const t = useTranslations("dashboard")
  const router = useRouter()
  const { signOut } = useClerk()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      // Logout is best-effort: even if a request fails (network), we still send the
      // user to /login, where the guard re-checks the session. Clear BOTH sessions
      // — our own bdph_session cookie and the Clerk session — so signing in with
      // Clerk and logging out doesn't leave a live Clerk session behind.
      try {
        await Promise.allSettled([logoutUser(), signOut()])
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
