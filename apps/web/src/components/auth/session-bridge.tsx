"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import type { PublicUser } from "@bdph/types"

import { useRouter } from "@/i18n/navigation"
import { bridgeClerkSession } from "@/lib/api"
import { postAuthPath } from "@/lib/roles"
import { RoleChoice } from "./role-choice"

// ClerkProvider sends sign-UP here with ?welcome=1 and sign-IN without it. That
// flag is the only thing distinguishing the two, and it decides nothing but
// whether to ask the role question — a returning user who forged it still gets
// the prompt gated on their actual role below, and the answer still goes
// through the server-side promotion endpoint.
const WELCOME_PARAM = "welcome"

// A delay that resolves immediately if the signal aborts and never leaves a timer
// running past the effect's lifetime.
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const id = setTimeout(resolve, ms)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id)
        resolve()
      },
      { once: true },
    )
  })
}

// Clerk redirects here after any successful sign-in or sign-up (email/password OR a
// social login like Google). Clerk has an active session at this point, so we swap
// its token for our own httpOnly bdph_session cookie — the app's real session — and
// then continue to the dashboard. Everything downstream (/auth/me, guards, RBAC,
// useCurrentUser) is unchanged: Clerk is only the identity source.
//
// We poll getToken briefly rather than gate on a "signed in" flag: right after a
// redirect Clerk may still be hydrating, so the session token can lag a beat. A
// single AbortController is the one cancellation source — re-checked after every
// await and passed into the bridge fetch — so an unmount (including StrictMode's
// mount→cleanup→mount in dev) can't fire a duplicate authenticated POST or leave a
// request running after this component is gone.
export function SessionBridge() {
  const { getToken, signOut } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("auth")
  const searchParams = useSearchParams()
  const [failed, setFailed] = useState(false)
  const [recovering, setRecovering] = useState(false)
  // Set only when the freshly bridged account should be asked to pick a role;
  // otherwise the effect navigates and this component never renders a choice.
  const [choosingRole, setChoosingRole] = useState(false)

  const isWelcome = searchParams.get(WELCOME_PARAM) === "1"

  // Sends the user to the surface their role belongs to: sellers (and admins,
  // by capability inheritance) to the dashboard, everyone else to the catalog.
  const goToApp = useCallback(
    (user: PublicUser | null) => {
      router.replace(postAuthPath(user))
      router.refresh()
    },
    [router],
  )

  // Return to sign-in, but clear the Clerk session first. After a failed bridge the
  // Clerk session is still active, so navigating straight to /login would make
  // <SignIn> immediately redirect back here — an infinite loop. Signing out lets
  // /login render the form again. redirectUrl keeps the current locale prefix.
  async function backToSignIn() {
    setRecovering(true)
    try {
      // On success this clears the Clerk session and navigates to /login, unmounting us.
      await signOut({ redirectUrl: `/${locale}/login` })
    } catch (error) {
      // Do NOT navigate to /login on failure: if sign-out didn't complete, the Clerk
      // session may still be active and /login would bounce us back to /complete (the
      // loop). Stay on this page and let the user retry.
      console.error("Clerk sign-out failed during sign-in recovery", error)
      setRecovering(false)
      setFailed(true)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function bridge() {
      // ~5s of retries covers Clerk hydrating + the session activating post-redirect.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (signal.aborted) return
        const token = await getToken().catch(() => null)
        if (signal.aborted) return
        if (token) {
          try {
            const user = await bridgeClerkSession(token, signal)
            if (signal.aborted) return
            // Ask only a brand-new account that still holds the default buyer
            // role. An existing seller or a staff account is routed straight
            // through, so the prompt can never overwrite a role they already
            // have — and re-signing in never asks again.
            if (isWelcome && user.role === "buyer") {
              setChoosingRole(true)
              return
            }
            goToApp(user)
          } catch {
            if (!signal.aborted) setFailed(true)
          }
          return
        }
        await delay(250, signal)
      }
      // No Clerk session resolved in the poll window. Show the recoverable failure
      // state rather than navigating to /login directly — its CTA signs out first, so
      // a session that activates late can't bounce us back to /complete (the loop).
      if (!signal.aborted) setFailed(true)
    }

    void bridge()
    return () => {
      controller.abort()
    }
  }, [getToken, router, isWelcome, goToApp])

  // The role step owns the page once the session exists — the account is already
  // usable at this point, so this is a routing question, not a second auth gate.
  if (choosingRole) {
    return (
      <RoleChoice
        onChosen={(choice) => {
          router.replace(choice === "seller" ? "/dashboard" : "/catalog")
          router.refresh()
        }}
      />
    )
  }

  // One persistent live region for both states, so a screen reader announces the
  // switch from "signing in" to the error (a status message per WCAG 4.1.3).
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      role="status"
      aria-live="polite"
      aria-busy={recovering}
    >
      {failed ? (
        <>
          <p className="text-sm text-muted-foreground">{t("completeError")}</p>
          <button
            type="button"
            onClick={backToSignIn}
            disabled={recovering}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
          >
            {t("completeRetry")}
          </button>
        </>
      ) : (
        <>
          <LoaderCircle className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("completing")}</p>
        </>
      )}
    </div>
  )
}
