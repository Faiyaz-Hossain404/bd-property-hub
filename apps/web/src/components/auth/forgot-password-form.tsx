"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"

import { requestPasswordResetInputSchema } from "@bdph/types"
import { ApiError, requestPasswordReset } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldShell } from "@/components/auth/field-shell"

export function ForgotPasswordForm() {
  const t = useTranslations("auth")
  const [isPending, startTransition] = useTransition()
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const data = new FormData(event.currentTarget)
    const parsed = requestPasswordResetInputSchema.safeParse({
      email: String(data.get("email") ?? "").trim(),
    })
    if (!parsed.success) {
      setEmailError(t("errorEmailInvalid"))
      return
    }
    setEmailError(null)

    startTransition(async () => {
      try {
        await requestPasswordReset(parsed.data.email)
        setSent(true)
      } catch (error) {
        setFormError(
          error instanceof ApiError && error.status === 0 ? t("errorNetwork") : t("errorUnexpected"),
        )
      }
    })
  }

  // Generic confirmation shown regardless of whether the email had an account, so
  // the page can't be used to probe which emails are registered.
  if (sent) {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
      >
        {t("forgotSent")}
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

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

      <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {t("forgotCta")}
      </Button>
    </form>
  )
}
