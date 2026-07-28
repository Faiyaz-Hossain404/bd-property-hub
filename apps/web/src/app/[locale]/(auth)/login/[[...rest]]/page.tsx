import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { SignInForm } from "@/components/auth/sign-in-form"

// Catch-all ([[...rest]]) so Clerk's prebuilt <SignIn> can own its own sub-steps
// (e.g. /login/factor-one, /login/sso-callback for social logins) under this route.
type PageParams = { params: Promise<{ locale: string; rest?: string[] }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("loginTitle") }
}

export default async function LoginPage({ params }: PageParams) {
  const { locale } = await params
  setRequestLocale(locale)
  // Prebuilt sign-in: email/password + any social connections enabled in the Clerk
  // dashboard (e.g. Google). Cross-links + post-auth redirect come from ClerkProvider.
  //
  // This page stays a server component so it can keep exporting generateMetadata
  // and calling setRequestLocale — neither is allowed in a client component. The
  // 'use client' boundary lives one level down in SignInForm, which is where the
  // Clerk hydration mismatch actually had to be handled.
  return <SignInForm locale={locale} />
}
