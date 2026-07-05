import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { AuthCard } from "@/components/auth/auth-card"
import { VerifyEmailView } from "@/components/auth/verify-email-view"

type PageParams = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("verifyTitle") }
}

export default async function VerifyEmailPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations("auth")

  return (
    <AuthCard title={t("verifyTitle")} description={t("verifySubtitle")} footer={<VerifyEmailFooter />}>
      <VerifyEmailView token={token ?? ""} />
    </AuthCard>
  )
}

// Small server component so the footer copy is translated without turning the
// whole card into a client component.
async function VerifyEmailFooter() {
  const t = await getTranslations("auth")
  return <span>{t("verifyFooter")}</span>
}
