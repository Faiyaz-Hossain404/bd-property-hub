import type { ReactNode } from "react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { DotPattern } from "@/components/ui/dot-pattern"
import { LocaleSwitch } from "@/components/auth/locale-switch"

type AuthLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const nav = await getTranslations("nav")

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <DotPattern
        className={cn(
          "text-olive/20",
          "mask-[radial-gradient(680px_circle_at_top,white,transparent)]"
        )}
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight text-foreground"
        >
          {nav("brand")}
        </Link>
        <LocaleSwitch />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  )
}
