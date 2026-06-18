"use client"

import { useCallback, useEffect, useState } from "react"
import type { PublicUser } from "@bdph/types"

import { ApiError, getMe } from "@/lib/api"

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

export function useCurrentUser(): UseCurrentUser {
  const [state, setState] = useState<CurrentUserState>({ status: "loading", user: null })
  // Bumping this re-runs the effect to retry after a transport error.
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => {
    setState({ status: "loading", user: null })
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let active = true

    getMe()
      .then((user) => {
        if (active) setState({ status: "authenticated", user })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) {
          setState({ status: "unauthenticated", user: null })
        } else {
          setState({ status: "error", user: null })
        }
      })

    return () => {
      active = false
    }
  }, [attempt])

  return { ...state, reload }
}
