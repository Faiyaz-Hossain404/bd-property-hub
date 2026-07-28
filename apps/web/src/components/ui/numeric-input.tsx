"use client"

import type * as React from "react"

import { Input } from "@/components/ui/input"

// Characters a browser lets you type into `type="number"` that none of these
// fields accept: scientific notation and a sign. They have to be blocked at the
// keystroke, not cleaned up afterwards — once one of them is in the field the
// input is in an "invalid" state and reports `value === ""`, so a change handler
// sees an empty string and has nothing to strip. That is exactly how "fldsfsf"
// ends up sitting in a price box that looks like it validates.
const BLOCKED_KEYS = ["e", "E", "+", "-"]

type Props = Omit<React.ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  value: string
  onValueChange: (next: string) => void
  // Counts and taka amounts are integers; areas and land sizes are not. Land
  // size especially — 2.5 katha is an ordinary way to describe a plot — so those
  // two keep the decimal point instead of having it stripped.
  allowDecimal?: boolean
}

// A number field that actually holds the line. `type="number"` on its own gives
// the numeric keypad on mobile, the spinner, and `min`, but it does NOT stop
// letters: every browser accepts 'e' as an exponent, and several accept a stray
// sign. This pairs it with a keydown block (covers typing) and a strip on change
// (covers paste and autofill, which never fire keydown).
export function NumericInput({ value, onValueChange, allowDecimal = false, ...props }: Props) {
  const disallowed = allowDecimal ? /[^0-9.]/g : /[^0-9]/g

  return (
    <Input
      {...props}
      type="number"
      min={0}
      // "any" keeps the browser from flagging a decimal as a step mismatch on a
      // field that is meant to take one.
      step={allowDecimal ? "any" : 1}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={value}
      onKeyDown={(event) => {
        const blocked =
          BLOCKED_KEYS.includes(event.key) || (!allowDecimal && event.key === ".")
        if (blocked) event.preventDefault()
      }}
      // A focused number input treats the wheel as a value change, so scrolling
      // the page with the cursor over one silently edits it. Dropping focus is
      // the usual fix and costs nothing here — these fields are saved by an
      // explicit button, never on blur.
      onWheel={(event) => event.currentTarget.blur()}
      onChange={(event) => onValueChange(event.target.value.replace(disallowed, ""))}
    />
  )
}
