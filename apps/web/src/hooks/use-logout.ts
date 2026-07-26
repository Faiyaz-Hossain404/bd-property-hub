"use client"

import { useTransition } from "react"
import { useClerk } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"

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
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  function logout() {
    startTransition(async () => {
      try {
        await Promise.allSettled([logoutUser(), signOut()])
      } finally {
        // Drop every cached query (admin user lists with names/emails/roles,
        // browsed listings, etc.) so a different user signing in on the same
        // tab can't be served the previous user's cached data. The QueryClient
        // lives in the shared root layout and this sign-out is a client-side
        // navigation, so it is never otherwise recreated between sessions.
        queryClient.clear()
        router.replace("/login")
        router.refresh()
      }
    })
  }

  return { logout, isPending }
}
