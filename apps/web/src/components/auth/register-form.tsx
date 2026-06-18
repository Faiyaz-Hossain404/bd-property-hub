"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { registerInputSchema, SUPPORTED_LOCALES, type Locale } from "@bdph/types"
import { useRouter } from "@/i18n/navigation"
import { ApiError, registerUser } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldShell } from "@/components/auth/field-shell"

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>

// Narrow the next-intl locale string to the schema's union; fall back to the
// schema default if an unexpected value ever appears.
function asLocale(value: string): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value) ? (value as Locale) : "en"
}

export function RegisterForm() {
  const t = useTranslations("auth")
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const data = new FormData(event.currentTarget)
    const password = String(data.get("password") ?? "")
    const parsed = registerInputSchema.safeParse({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password,
      locale: asLocale(locale),
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

    startTransition(async () => {
      try {
        await registerUser(parsed.data)
        router.replace("/")
        router.refresh()
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          setFieldErrors((prev) => ({ ...prev, email: t("errorEmailExists") }))
        } else if (error instanceof ApiError && error.status === 0) {
          setFormError(t("errorNetwork"))
        } else {
          setFormError(t("errorUnexpected"))
        }
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
            aria-describedby={
              fieldErrors.password ? "password-error" : "password-hint"
            }
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

      <Button type="submit" size="lg" className="mt-1 h-11 w-full" disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {t("registerCta")}
      </Button>
    </form>
  )
}
