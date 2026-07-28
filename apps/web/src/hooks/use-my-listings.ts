"use client"

import { useQuery } from "@tanstack/react-query"
import type { PublicListing } from "@bdph/types"

import { getMyListings } from "@/lib/api"

// ONE cache entry for /listings/mine, now that three surfaces read it: the
// dashboard summary (counts), /dashboard/drafts (the drafts), and
// /dashboard/listings (everything else). The key used to live in drafts-grid,
// which was fine while that was the only reader — but a second component
// importing a query key from a sibling component is how two copies of the same
// list start drifting apart. Submitting a draft has to remove it from the drafts
// page AND add it to the listings page, and that only works if both are looking
// at the same cache entry.
export const MY_LISTINGS_QUERY_KEY = ["listings", "mine"] as const

// `draft` is the only status a listing sits in before it has ever been
// submitted. The API has no per-status listing endpoint, so the split happens
// here rather than by adding one.
export function draftsOf(listings: PublicListing[]): PublicListing[] {
  return listings.filter((listing) => listing.publicationStatus === "draft")
}

// The complement: pending_review, approved, rejected, archived, removed —
// everything that has been submitted at least once.
export function submittedOf(listings: PublicListing[]): PublicListing[] {
  return listings.filter((listing) => listing.publicationStatus !== "draft")
}

export function useMyListings() {
  return useQuery({
    queryKey: MY_LISTINGS_QUERY_KEY,
    queryFn: getMyListings,
  })
}
