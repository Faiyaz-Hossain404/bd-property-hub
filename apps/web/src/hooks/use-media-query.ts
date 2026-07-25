"use client"

import { useCallback, useSyncExternalStore } from "react"

// SSR-safe media-query subscription. Returns false during SSR and the very first
// client render (so server and client agree — no hydration mismatch), then the
// real match once mounted. Re-renders when the query starts/stops matching.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined") return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener("change", callback)
      return () => mql.removeEventListener("change", callback)
    },
    [query],
  )

  const getSnapshot = useCallback(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
