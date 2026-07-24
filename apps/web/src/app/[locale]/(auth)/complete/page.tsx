import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { SessionBridge } from "@/components/auth/session-bridge"

// Landing page Clerk redirects to after sign-in/up. The client SessionBridge
// exchanges the Clerk session for our bdph_session cookie, then goes to /dashboard.
type PageParams = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("completing") }
}

export default async function CompletePage({ params }: PageParams) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SessionBridge />
}
