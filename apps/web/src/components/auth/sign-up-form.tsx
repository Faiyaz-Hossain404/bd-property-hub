"use client"

import { useEffect, useState } from "react"
import { SignUp } from "@clerk/nextjs"

import { AuthFormSkeleton } from "./auth-form-skeleton"

// Same mount gate as SignInForm, for the same reason — <SignUp> has identical
// SSR behaviour to <SignIn>, so /register carried the same hydration mismatch
// even though only /login was reported. See sign-in-form.tsx for the full
// rationale and the trade-off.
//
// Kept as its own file rather than a shared mode-switching component so /login
// does not pull Clerk's sign-up bundle and /register does not pull sign-in's.
export function SignUpForm({ locale }: { locale: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <AuthFormSkeleton />
  }

  // `path` must carry the locale prefix so Clerk keeps its own sub-steps
  // (/register/verify-email-address, /register/sso-callback) inside the
  // localized route. `fallback` closes the post-gate gap — see sign-in-form.tsx
  // for why the empty host div would otherwise flash as a collapsed card.
  return (
    <SignUp routing="path" path={`/${locale}/register`} fallback={<AuthFormSkeleton />} />
  )
}
