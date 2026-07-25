"use client"

import { useTransition } from "react"
import { useClerk } from "@clerk/nextjs"

import { useRouter } from "@/i18n/navigation"
import { logoutUser } from "@/lib/api"

// Shared sign-out used by the header user menu and the mobile nav. Logout is
// best-effort: even if a request fails (network), we still route to /login where
// the guard re-checks the session. Clear BOTH sessions — our own bdph_session
// cookie AND the Clerk session — so signing in with Clerk and logging out doesn't
// leave a live Clerk session behind.
export function useLogout(): { logout: () => void; isPending: boolean } {
  const router = useRouter()
  const { signOut } = useClerk()
  const [isPending, startTransition] = useTransition()

  function logout() {
    startTransition(async () => {
      try {
        await Promise.allSettled([logoutUser(), signOut()])
      } finally {
        router.replace("/login")
        router.refresh()
      }
    })
  }

  return { logout, isPending }
}
