"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useSignUp, useAuth } from "@clerk/nextjs"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { registerInputSchema } from "@bdph/types"
import { useRouter } from "@/i18n/navigation"
import { ApiError, bridgeClerkSession } from "@/lib/api"
import { clerkErrorCode } from "@/lib/clerk-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldShell } from "@/components/auth/field-shell"

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>
type Step = "details" | "verify"

// Sign-up with Clerk's headless hook. Step 1 collects name/email/password and
// starts a Clerk sign-up + emails a code; step 2 confirms the code, then bridges
// to our own session cookie. The details-step card UI matches the first-party
// version this replaced — only the submit path and the added code step are new.
export function RegisterForm() {
  const t = useTranslations("auth")
  const router = useRouter()
  const { signUp } = useSignUp()
  const { getToken } = useAuth()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState<Step>("details")
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string | undefined>(undefined)

  // Finalize the Clerk session, exchange it for our cookie, then go to dashboard.
  async function completeAndBridge(): Promise<void> {
    if (!signUp) return
    const { error } = await signUp.finalize({ navigate: async () => {} })
    if (error) {
      setFormError(t("errorUnexpected"))
      return
    }
    const token = await getToken()
    if (!token) {
      setFormError(t("errorUnexpected"))
      return
    }
    await bridgeClerkSession(token)
    router.replace("/dashboard")
    router.refresh()
  }

  function mapCreateError(error: unknown): string {
    const code = clerkErrorCode(error)
    if (code === "form_identifier_exists") return t("errorEmailExists")
    if (code === "form_param_format_invalid") return t("errorEmailInvalid")
    if (code?.startsWith("form_password")) return t("errorPasswordShort")
    return t("errorUnexpected")
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const data = new FormData(event.currentTarget)
    const password = String(data.get("password") ?? "")
    const parsed = registerInputSchema.safeParse({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password,
    })

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      setFieldErrors({
        name: flat.name ? t("errorNameRequired") : undefined,
        email: flat.email ? t("errorEmailInvalid") : undefined,
        password: flat.password
          ? password.length === 0
            ? t("errorPasswordRequired")
            : t("errorPasswordShort")
          : undefined,
      })
      return
    }
    setFieldErrors({})

    if (!signUp) return

    startTransition(async () => {
      try {
        // Carry the entered name into Clerk so the synced account keeps it.
        const { error } = await signUp.password({
          emailAddress: parsed.data.email,
          password: parsed.data.password,
          firstName: parsed.data.name,
        })
        if (error) {
          setFormError(mapCreateError(error))
          return
        }
        const { error: sendError } = await signUp.verifications.sendEmailCode()
        if (sendError) {
          setFormError(t("errorUnexpected"))
          return
        }
        setStep("verify")
      } catch (error) {
        setFormError(
          error instanceof ApiError && error.status === 0
            ? t("errorNetwork")
            : t("errorUnexpected"),
        )
      }
    })
  }

  function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setCodeError(undefined)

    if (!signUp) return
    const trimmed = code.trim()
    if (trimmed.length === 0) {
      setCodeError(t("errorCodeInvalid"))
      return
    }

    startTransition(async () => {
      try {
        const { error } = await signUp.verifications.verifyEmailCode({ code: trimmed })
        if (error || signUp.status !== "complete") {
          setCodeError(t("errorCodeInvalid"))
          return
        }
        await completeAndBridge()
      } catch (error) {
        setFormError(
          error instanceof ApiError && error.status === 0
            ? t("errorNetwork")
            : t("errorUnexpected"),
        )
      }
    })
  }

  function handleResendCode() {
    if (!signUp) return
    setFormError(null)
    startTransition(async () => {
      const { error } = await signUp.verifications.sendEmailCode()
      if (error) setFormError(t("errorUnexpected"))
    })
  }

  const errorBanner = formError ? (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {formError}
    </div>
  ) : null

  if (step === "verify") {
    return (
      <form noValidate onSubmit={handleVerifySubmit} className="flex flex-col gap-5">
        {errorBanner}
        <div className="space-y-1">
          <p className="font-heading text-lg font-semibold text-foreground">
            {t("verifyCodeTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("verifyCodeSubtitle")}</p>
        </div>

        <FieldShell id="code" label={t("verifyCodeLabel")} error={codeError}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            // Move focus to the code field when this step appears, so keyboard and
            // screen-reader users are taken to the new input after step one.
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("verifyCodePlaceholder")}
            aria-invalid={Boolean(codeError)}
            aria-describedby={codeError ? "code-error" : undefined}
            className="h-11 tracking-widest"
          />
        </FieldShell>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isPending || !signUp}>
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {t("verifyCodeCta")}
        </Button>

        <button
          type="button"
          onClick={handleResendCode}
          disabled={isPending}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          {t("verifyCodeResend")}
        </button>
      </form>
    )
  }

  return (
    <form noValidate onSubmit={handleDetailsSubmit} className="flex flex-col gap-5">
      {errorBanner}

      <FieldShell id="name" label={t("nameLabel")} error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          className="h-11"
        />
      </FieldShell>

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
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
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
        {!fieldErrors.password ? (
          <p id="password-hint" className="text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
        ) : null}
      </FieldShell>

      {/* Clerk's bot-signup protection (Smart CAPTCHA) mounts here when enabled. */}
      <div id="clerk-captcha" />

      <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isPending || !signUp}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {t("registerCta")}
      </Button>
    </form>
  )
}
