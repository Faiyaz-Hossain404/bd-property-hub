"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useSignIn, useAuth } from "@clerk/nextjs"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { loginInputSchema } from "@bdph/types"
import { Link, useRouter } from "@/i18n/navigation"
import { ApiError, bridgeClerkSession } from "@/lib/api"
import { clerkErrorCode } from "@/lib/clerk-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldShell } from "@/components/auth/field-shell"

type FieldErrors = Partial<Record<"email" | "password", string>>

// Clerk error codes that mean "wrong email or password" — mapped to one generic
// message so the response can't be used to tell which of the two was wrong.
const INVALID_CREDENTIAL_CODES = new Set([
  "form_identifier_not_found",
  "form_password_incorrect",
  "form_param_format_invalid",
])

// Sign-in with Clerk's headless hook, then bridge to our own session cookie.
// The card UI is unchanged from the first-party version — only the submit path
// now goes through Clerk.
export function LoginForm() {
  const t = useTranslations("auth")
  const router = useRouter()
  const { signIn } = useSignIn()
  const { getToken } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const data = new FormData(event.currentTarget)
    const parsed = loginInputSchema.safeParse({
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    })

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      setFieldErrors({
        email: flat.email ? t("errorEmailInvalid") : undefined,
        password: flat.password ? t("errorPasswordRequired") : undefined,
      })
      return
    }
    setFieldErrors({})

    if (!signIn) return

    startTransition(async () => {
      try {
        const { error } = await signIn.password({
          identifier: parsed.data.email,
          password: parsed.data.password,
        })
        if (error) {
          const code = clerkErrorCode(error)
          setFormError(
            code && INVALID_CREDENTIAL_CODES.has(code)
              ? t("errorInvalidCredentials")
              : t("errorUnexpected"),
          )
          return
        }
        // Anything other than 'complete' (e.g. a second factor) isn't handled by
        // this minimal custom UI yet — surface a generic error rather than hang.
        if (signIn.status !== "complete") {
          setFormError(t("errorUnexpected"))
          return
        }
        // finalize activates the Clerk session (no separate navigation of ours).
        const { error: finalizeError } = await signIn.finalize({ navigate: async () => {} })
        if (finalizeError) {
          setFormError(t("errorUnexpected"))
          return
        }
        const token = await getToken()
        if (!token) {
          setFormError(t("errorUnexpected"))
          return
        }
        // Exchange the Clerk session for our own cookie; downstream is unchanged.
        await bridgeClerkSession(token)
        router.replace("/dashboard")
        router.refresh()
      } catch (error) {
        setFormError(
          error instanceof ApiError && error.status === 0
            ? t("errorNetwork")
            : t("errorUnexpected"),
        )
      }
    })
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

      <FieldShell id="email" label={t("emailLabel")} error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className="h-11"
        />
      </FieldShell>

      <FieldShell id="password" label={t("passwordLabel")} error={fieldErrors.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
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
      </FieldShell>

      <div className="-mt-2 text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("forgotLink")}
        </Link>
      </div>

      <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isPending || !signIn}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {t("loginCta")}
      </Button>
    </form>
  )
}
