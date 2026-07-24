"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { bridgeClerkSession } from "@/lib/api"

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
  const { getToken } = useAuth()
  const router = useRouter()
  const t = useTranslations("auth")
  const [failed, setFailed] = useState(false)

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
            await bridgeClerkSession(token, signal)
            if (signal.aborted) return
            router.replace("/dashboard")
            router.refresh()
          } catch {
            if (!signal.aborted) setFailed(true)
          }
          return
        }
        await delay(250, signal)
      }
      // No Clerk session showed up — send them back to sign in.
      if (!signal.aborted) router.replace("/login")
    }

    void bridge()
    return () => {
      controller.abort()
    }
  }, [getToken, router])

  // One persistent live region for both states, so a screen reader announces the
  // switch from "signing in" to the error (a status message per WCAG 4.1.3).
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      role="status"
      aria-live="polite"
    >
      {failed ? (
        <>
          <p className="text-sm text-muted-foreground">{t("completeError")}</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
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
