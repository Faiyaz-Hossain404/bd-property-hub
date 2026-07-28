"use client"

import { useEffect, useState } from "react"
import { SignIn } from "@clerk/nextjs"

import { AuthFormSkeleton } from "./auth-form-skeleton"

// Clerk's prebuilt <SignIn> renders a <Suspense> shell during SSR and replaces it
// with its own host element (<div data-clerk-component="SignIn">) once Clerk's
// script takes over on the client. Those two trees do not match, so hydrating
// this route always logged "Hydration failed because the server rendered HTML
// didn't match the client" and React threw the server output away and re-rendered
// the subtree anyway. The mismatch is inside Clerk's own render, not app code.
//
// Gating on a mount flag makes that handoff explicit instead of accidental: the
// server render and the FIRST client render both produce the skeleton, so they
// agree and hydration succeeds; Clerk mounts on the second render, when React is
// already past hydration and a plain re-render is expected.
//
// The trade-off is that the form no longer server-renders. That is acceptable
// here and nowhere else: it is an interactive auth widget that cannot work
// without JS, Clerk was discarding the server HTML regardless, and the page is
// not one we want indexed.
export function SignInForm({ locale }: { locale: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <AuthFormSkeleton />
  }

  // `path` must carry the locale prefix so Clerk keeps its own sub-steps
  // (/login/factor-one, /login/sso-callback) inside the localized route.
  //
  // `fallback` covers the gap the mount gate alone leaves. Clearing the gate is
  // not the same as Clerk being ready: on this render Clerk mounts an empty host
  // div and only paints into it once clerk-js finishes. Clerk hides that div
  // (style: display:none) ONLY while a fallback exists — with no fallback the
  // empty div renders visible and collapsed, so the sequence a user on a slow
  // connection sees is skeleton, then a collapsed card, then the form. Passing
  // the same skeleton keeps the box filled straight through to the real form.
  return (
    <SignIn routing="path" path={`/${locale}/login`} fallback={<AuthFormSkeleton />} />
  )
}
