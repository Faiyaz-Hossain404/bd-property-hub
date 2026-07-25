"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { ApiError, getSavedListingIds, saveListing, unsaveListing } from "@/lib/api"
import { useCurrentUser } from "@/hooks/use-current-user"

export type SavedListings = {
  isAuthenticated: boolean
  ready: boolean
  isSaved: (id: string) => boolean
  toggle: (id: string) => void
  error: string | null
}

// Shared favourites state for the whole catalog: fetches the buyer's saved ids
// ONCE (not once per card), then toggles optimistically with rollback. The API
// stays the source of truth (idempotent, caller-scoped); this is a fast local
// mirror shared by every card and the preview rail.
export function useSavedListings(): SavedListings {
  const t = useTranslations("catalog.save")
  const { status } = useCurrentUser()
  const isAuthenticated = status === "authenticated"
  const [ids, setIds] = useState<Set<string> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Latest ids for the toggle handler to read without depending on (and being
  // re-created by) each state change.
  const idsRef = useRef<Set<string> | null>(null)
  idsRef.current = ids
  // Ids with a save/unsave request currently in flight — used to serialise
  // toggles per id so two rapid clicks can't fire overlapping, out-of-order calls.
  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isAuthenticated) {
      setIds(null)
      return
    }
    let active = true
    getSavedListingIds()
      .then((list) => {
        if (active) setIds(new Set(list))
      })
      .catch(() => {
        // A lookup failure leaves cards usable as "not saved"; a failed toggle
        // below still surfaces its own error.
        if (active) setIds(new Set())
      })
    return () => {
      active = false
    }
  }, [isAuthenticated])

  const isSaved = useCallback((id: string) => ids?.has(id) ?? false, [ids])

  const toggle = useCallback(
    (id: string) => {
      // Ignore the toggle until the initial saved-ids fetch has landed (an
      // in-flight fetch would otherwise overwrite this optimistic change), while
      // signed out, or while this id already has a request in flight.
      if (!isAuthenticated || idsRef.current === null || pendingRef.current.has(id)) return
      setError(null)
      const nextSaved = !idsRef.current.has(id)
      const optimistic = new Set(idsRef.current)
      if (nextSaved) optimistic.add(id)
      else optimistic.delete(id)
      // Sync the ref immediately so a second click before the next render reads
      // the already-toggled state.
      idsRef.current = optimistic
      setIds(optimistic)
      pendingRef.current.add(id)
      const request = nextSaved ? saveListing(id) : unsaveListing(id)
      request
        .catch((toggleError: unknown) => {
          // If the user signed out mid-flight, ids was reset to null — don't
          // resurrect stale saved-state for a signed-out user.
          if (idsRef.current === null) return
          // Roll this id's optimistic change back (leaving any other ids toggled
          // meanwhile untouched) and surface the failure.
          const reverted = new Set(idsRef.current)
          if (nextSaved) reverted.delete(id)
          else reverted.add(id)
          idsRef.current = reverted
          setIds(reverted)
          setError(toggleError instanceof ApiError ? toggleError.message : t("error"))
        })
        .finally(() => {
          pendingRef.current.delete(id)
        })
    },
    [isAuthenticated, t],
  )

  return { isAuthenticated, ready: ids !== null, isSaved, toggle, error }
}
