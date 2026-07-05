"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { resetPasswordInputSchema } from "@bdph/types"
import { Link } from "@/i18n/navigation"
import { ApiError, resetPassword } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldShell } from "@/components/auth/field-shell"

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth")
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Once the reset succeeds the token is spent — drop it from the URL so it isn't
  // left in browser history or leaked via the Referer header on later navigation.
  useEffect(() => {
    if (done && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [done])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const data = new FormData(event.currentTarget)
    const password = String(data.get("password") ?? "")
    const parsed = resetPasswordInputSchema.safeParse({ token, password })
    if (!parsed.success) {
      setPasswordError(password.length === 0 ? t("errorPasswordRequired") : t("errorPasswordShort"))
      return
    }
    setPasswordError(null)

    startTransition(async () => {
      try {
        await resetPassword(parsed.data.token, parsed.data.password)
        setDone(true)
      } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
          setFormError(t("resetInvalid"))
        } else if (error instanceof ApiError && error.status === 0) {
          setFormError(t("errorNetwork"))
        } else {
          setFormError(t("errorUnexpected"))
        }
      }
    })
  }

  // A missing token means the page was opened without a valid link.
  if (!token) {
    return <LinkProblem message={t("resetInvalid")} cta={t("forgotCta")} />
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
        >
          {t("resetDone")}
        </div>
        <Button asChild size="lg" className="h-11 w-full">
          <Link href="/login">{t("loginCta")}</Link>
        </Button>
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

      <FieldShell id="password" label={t("newPasswordLabel")} error={passwordError ?? undefined}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "password-error" : "password-hint"}
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {!passwordError ? (
          <p id="password-hint" className="text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
        ) : null}
      </FieldShell>

      <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {t("resetCta")}
      </Button>
    </form>
  )
}

// Shown when the token is missing or rejected — routes the user back to request a
// fresh reset link.
function LinkProblem({ message, cta }: { message: string; cta: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive"
      >
        {message}
      </div>
      <Button asChild size="lg" variant="outline" className="h-11 w-full">
        <Link href="/forgot-password">{cta}</Link>
      </Button>
    </div>
  )
}
