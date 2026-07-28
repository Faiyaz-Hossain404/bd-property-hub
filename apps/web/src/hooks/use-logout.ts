"use client"

import { useRef, useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { useLocale } from "next-intl"

import { logoutUser } from "@/lib/api"

// Hard ceiling on how long "Signing out..." can stay on screen. If neither
// teardown has settled by now, the user is redirected anyway — a sign-out that
// hangs is worse than one that leaves a session to expire on its own.
const REDIRECT_SAFEGUARD_MS = 1_500

// Shared sign-out used by the header user menu and the mobile nav.
//
// Both sessions are torn down, because they are independent: our own
// bdph_session cookie (server-side revoke + clear) and Clerk's client-side
// session. Clearing only one leaves the other live, and Clerk's would silently
// sign the user back in on the next page that bridges a session.
//
// The redirect is a FULL page load, not a client-side route change. Sign-out is
// the one navigation where throwing the entire JS context away is the feature:
// it guarantees no component keeps stale auth state, no in-flight request
// resolves against the old session, and the new page re-reads cookies from
// scratch. The previous client-side router.replace() left the transition open
// until every teardown, cache clear and RSC fetch settled, so anything that
// stalled anywhere in that chain pinned the button on "Signing out..." forever.
export function useLogout(): {
  logout: (onSettled?: () => void) => void
  isPending: boolean
} {
  const { signOut } = useClerk()
  const queryClient = useQueryClient()
  const locale = useLocale()
  const [isPending, setIsPending] = useState(false)
  // Survives re-renders so the safeguard and the happy path cannot both fire.
  const redirectedRef = useRef(false)

  function logout(onSettled?: () => void) {
    if (redirectedRef.current || isPending) return
    setIsPending(true)

    // Locale-aware, not a hardcoded /en/login: signing out of the Bengali site
    // must not silently drop the user into English.
    const loginUrl = `/${locale}/login`

    // Exactly one navigation wins, whichever arrives first.
    const redirect = () => {
      if (redirectedRef.current) return
      redirectedRef.current = true

      // Drop every cached query (admin user lists with names/emails/roles,
      // browsed listings) so nothing survives into the next session. Mostly
      // belt-and-braces given the full page load below, but it also covers the
      // gap between here and the browser actually unloading the document.
      queryClient.clear()
      onSettled?.()

      // replace(), not href/assign: the signed-in dashboard must not sit in
      // history where the back button can restore its rendered shell.
      window.location.replace(loginUrl)
    }

    const safeguard = window.setTimeout(redirect, REDIRECT_SAFEGUARD_MS)

    void (async () => {
      try {
        // allSettled, not all: a failing backend call must not stop Clerk's
        // sign-out (or the reverse). Both are best-effort — the redirect below
        // happens either way.
        await Promise.allSettled([logoutUser(), signOut()])
      } catch (error) {
        // allSettled does not reject, so this only catches a synchronous throw
        // from signOut() itself. Swallowed deliberately: there is no recovery
        // beyond getting the user to the login page, which finally does.
        console.error("Sign-out teardown failed", error)
      } finally {
        window.clearTimeout(safeguard)
        redirect()
      }
    })()
  }

  return { logout, isPending }
}
