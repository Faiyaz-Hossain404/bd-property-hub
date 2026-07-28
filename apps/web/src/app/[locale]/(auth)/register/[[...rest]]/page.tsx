import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { SignUpForm } from "@/components/auth/sign-up-form"

// Catch-all ([[...rest]]) so Clerk's prebuilt <SignUp> can own its own sub-steps
// (e.g. /register/verify-email-address, /register/sso-callback) under this route.
type PageParams = { params: Promise<{ locale: string; rest?: string[] }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("registerTitle") }
}

export default async function RegisterPage({ params }: PageParams) {
  const { locale } = await params
  setRequestLocale(locale)
  // Prebuilt sign-up: email/password + email-code verification + any social
  // connections enabled in the Clerk dashboard. Redirects come from ClerkProvider.
  //
  // Stays a server component (generateMetadata + setRequestLocale); the
  // 'use client' boundary and the Clerk hydration gate live in SignUpForm.
  return <SignUpForm locale={locale} />
}
