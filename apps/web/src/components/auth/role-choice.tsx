"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Home, LoaderCircle, Store } from "lucide-react"

import { becomeSeller } from "@/lib/api"
import { cn } from "@/lib/utils"

type Choice = "buyer" | "seller"

type RoleChoiceProps = {
  /**
   * Receives the chosen role once it is committed. Buyers commit locally (the
   * API already creates every account as a buyer), sellers only after the
   * promotion call succeeds — so navigation never runs ahead of the real role.
   */
  onChosen: (choice: Choice) => void
}

const OPTIONS = [
  { value: "buyer", Icon: Home },
  { value: "seller", Icon: Store },
] as const

// Shown once, immediately after sign-up, before the user reaches the app.
//
// "Buyer" needs no request: the API already provisions every new account as a
// buyer, so choosing it is purely a routing decision. "Seller" calls the
// existing POST /me/become-seller, which is deliberately the only self-service
// role mutation — it promotes a plain buyer and refuses to touch any other
// role, so it cannot demote staff. There is no client-supplied role in either
// path; the server decides.
export function RoleChoice({ onChosen }: RoleChoiceProps) {
  const t = useTranslations("auth")
  const [pending, setPending] = useState<Choice | null>(null)
  const [failed, setFailed] = useState(false)

  async function choose(choice: Choice) {
    if (pending) return
    setPending(choice)
    setFailed(false)

    if (choice === "buyer") {
      onChosen(choice)
      return
    }

    try {
      await becomeSeller()
      onChosen(choice)
    } catch {
      // Stay put and let them retry: sending a would-be seller to the buyer
      // catalog after a failed promotion would silently hand them the wrong
      // account, and the dashboard would reject them for lacking the role.
      setFailed(true)
      setPending(null)
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-center font-heading text-2xl font-semibold text-foreground">
        {t("roleTitle")}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">{t("roleSubtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map(({ value, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => void choose(value)}
            disabled={pending !== null}
            aria-busy={pending === value}
            className={cn(
              "group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left",
              "transition-colors hover:border-primary hover:bg-accent/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {pending === value ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <Icon className="size-5" />
              )}
            </span>
            <span className="font-heading text-base font-semibold text-foreground">
              {t(`role_${value}_title`)}
            </span>
            <span className="text-sm text-muted-foreground">{t(`role_${value}_body`)}</span>
          </button>
        ))}
      </div>

      {/* Announced politely so a screen reader hears the failure without the
          focus jump an assertive alert would cause mid-choice. */}
      <p role="status" aria-live="polite" className="mt-4 min-h-5 text-center text-sm text-destructive">
        {failed ? t("roleError") : ""}
      </p>

      <p className="mt-2 text-center text-xs text-muted-foreground">{t("roleFootnote")}</p>
    </div>
  )
}
