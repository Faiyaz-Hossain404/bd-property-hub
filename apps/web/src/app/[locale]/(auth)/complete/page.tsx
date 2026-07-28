import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { LoaderCircle } from "lucide-react"

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
  // SessionBridge reads the ?welcome flag with useSearchParams, which opts the
  // subtree into client-side rendering — without a boundary the whole route is
  // forced dynamic and the build errors. The fallback matches the bridge's own
  // loading state, so there is no visible flicker between the two.
  return (
    <Suspense fallback={<LoaderCircle className="mx-auto size-6 animate-spin text-primary" />}>
      <SessionBridge />
    </Suspense>
  )
}
