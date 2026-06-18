import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { BorderBeam } from "@/components/ui/border-beam"

type AuthCardProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

// Presentational shell for the auth screens. Two offset border beams in the
// earthy palette (clay→ochre, olive→dusty-blue) give the card a warm, layered
// edge without competing with the form content.
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <Card className="relative w-full max-w-md gap-0 p-0 shadow-xl">
      <BorderBeam size={140} duration={9} colorFrom="#bc6b49" colorTo="#d8a24e" />
      <BorderBeam
        size={140}
        duration={9}
        delay={4.5}
        reverse
        colorFrom="#8e9070"
        colorTo="#a9c3ca"
      />

      <div className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>

      <div className="border-t bg-muted/40 px-8 py-4 text-center text-sm text-muted-foreground">
        {footer}
      </div>
    </Card>
  )
}
