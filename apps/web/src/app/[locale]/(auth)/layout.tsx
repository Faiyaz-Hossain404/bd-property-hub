import type { ReactNode } from "react"
import { setRequestLocale } from "next-intl/server"

import { cn } from "@/lib/utils"
import { DotPattern } from "@/components/ui/dot-pattern"
import { SiteHeader } from "@/components/layout/site-header"

type AuthLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Focused sign-in surface: brand + language only, no primary nav. */}
      <SiteHeader user={null} variant="minimal" />

      <DotPattern
        className={cn(
          "text-olive/20",
          "mask-[radial-gradient(680px_circle_at_top,white,transparent)]",
        )}
      />

      <main className="relative flex flex-1 items-center justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  )
}
