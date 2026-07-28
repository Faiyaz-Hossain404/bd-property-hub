"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PublicUser } from "@bdph/types"

import { ApiError, getMe } from "@/lib/api"

// ONE shared cache entry for the signed-in user, read by every call site.
//
// This used to be per-component useState plus a one-shot useEffect, which meant
// the seven independent useCurrentUser() instances each held a private copy that
// nothing outside the component could reach. Sign-out could clear the cookie but
// had no way to tell the already-mounted header, so it kept rendering the
// previous user's name and avatar until the page was reloaded by hand. Holding
// the value in the QueryClient makes it invalidatable from anywhere, which is
// what useLogout's queryClient.clear() now actually acts on.
export const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const

// Distinguishes the three outcomes the dashboard guard cares about:
// - "authenticated": a valid session resolved a user
// - "unauthenticated": the API returned 401 — no/expired session, redirect to login
// - "error": transport failure (network/CORS) — show a retry, do NOT bounce to login
type CurrentUserState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: PublicUser }
  | { status: "unauthenticated"; user: null }
  | { status: "error"; user: null }

type UseCurrentUser = CurrentUserState & { reload: () => void }

const MAX_RETRIES = 3

export function useCurrentUser(): UseCurrentUser {
  const { data, error, status, refetch } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getMe,
    // Always revalidate on mount. The session can be revoked server-side at any
    // moment (sign-out in another tab, an admin suspend, a password reset), so
    // unlike listing data there is no window in which a cached "signed in" is
    // safe to trust. The provider's 5-minute default would be exactly wrong here.
    staleTime: 0,
    // A 401 is a definitive answer ("you are signed out"), not a transport
    // failure worth retrying. The provider sets the same rule globally; it is
    // restated because this query's correctness depends on it, and a later edit
    // to that default must not silently make sign-out wait through 3 backoffs.
    retry: (failureCount, queryError) =>
      queryError instanceof ApiError && queryError.status >= 400 && queryError.status < 500
        ? false
        : failureCount < MAX_RETRIES,
  })

  // `refetch` keeps a stable identity in v5, so `reload` stays referentially
  // stable for the callers that list it as an effect dependency.
  const reload = useCallback(() => {
    void refetch()
  }, [refetch])

  if (status === "success") {
    return { status: "authenticated", user: data, reload }
  }
  if (status === "error") {
    return error instanceof ApiError && error.status === 401
      ? { status: "unauthenticated", user: null, reload }
      : { status: "error", user: null, reload }
  }
  return { status: "loading", user: null, reload }
}
