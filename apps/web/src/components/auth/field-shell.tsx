import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

type FieldShellProps = {
  id: string
  label: string
  error?: string
  children: ReactNode
}

// Label + control + inline error, wired for accessibility. The control supplies
// its own aria-invalid / aria-describedby={`${id}-error`}.
export function FieldShell({ id, label, error, children }: FieldShellProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
