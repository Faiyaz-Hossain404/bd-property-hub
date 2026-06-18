import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { RegisterForm } from "@/components/auth/register-form"

type PageParams = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("registerTitle") }
}

export default async function RegisterPage({ params }: PageParams) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")

  return (
    <AuthCard
      title={t("registerTitle")}
      description={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("loginCta")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
