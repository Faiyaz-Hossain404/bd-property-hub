"use client"

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"

import { resendVerificationInputSchema } from "@bdph/types"
import { Link } from "@/i18n/navigation"
import { ApiError, resendVerification, verifyEmail } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldShell } from "@/components/auth/field-shell"

type Status = "loading" | "success" | "error" | "missing"

export function VerifyEmailView({ token }: { token: string }) {
  const t = useTranslations("auth")
  const [status, setStatus] = useState<Status>(token ? "loading" : "missing")
  const startedRef = useRef(false)

  useEffect(() => {
    if (!token || startedRef.current) return
    startedRef.current = true
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"))
  }, [token])

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
        <p className="text-sm">{t("verifyChecking")}</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="size-5 shrink-0 text-olive" />
          {t("verifySuccess")}
        </div>
        <Button asChild size="lg" className="h-11 w-full">
          <Link href="/dashboard">{t("verifyGoToDashboard")}</Link>
        </Button>
      </div>
    )
  }

  // error or missing token — explain and let the user request a fresh link.
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <XCircle className="size-5 shrink-0" />
        {t("verifyInvalid")}
      </div>
      <ResendVerification />
    </div>
  )
}

// Compact resend block. Always confirms generically (no account enumeration).
function ResendVerification() {
  const t = useTranslations("auth")
  const [isPending, startTransition] = useTransition()
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const parsed = resendVerificationInputSchema.safeParse({
      email: String(data.get("email") ?? "").trim(),
    })
    if (!parsed.success) {
      setEmailError(t("errorEmailInvalid"))
      return
    }
    setEmailError(null)
    startTransition(async () => {
      try {
        await resendVerification(parsed.data.email)
      } catch {
        // Still show the generic confirmation — never reveal send/lookup outcome.
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
      >
        {t("verifyResent")}
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("verifyResendPrompt")}</p>
      <FieldShell id="email" label={t("emailLabel")} error={emailError ?? undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
          className="h-11"
        />
      </FieldShell>
      <Button type="submit" size="lg" variant="outline" className="h-11 w-full" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {t("verifyResendCta")}
      </Button>
    </form>
  )
}
