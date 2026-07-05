import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

type PageParams = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("resetTitle") }
}

export default async function ResetPasswordPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  setRequestLocale(locale)
  // Read the token server-side and pass it down as a prop, so the client form
  // doesn't need useSearchParams (and no Suspense boundary is required).
  const { token } = await searchParams
  const t = await getTranslations("auth")

  return (
    <AuthCard
      title={t("resetTitle")}
      description={t("resetSubtitle")}
      footer={
        <>
          {t("rememberedPassword")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("loginCta")}
          </Link>
        </>
      }
    >
      <ResetPasswordForm token={token ?? ""} />
    </AuthCard>
  )
}
