// Read a Clerk error code out of the `{ error }` value the headless signals API
// resolves with (its methods return errors rather than throwing). Kept tolerant
// of the exact error shape so a future SDK change doesn't break error mapping.
export function clerkErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const shaped = error as { code?: string; errors?: Array<{ code?: string }> }
    return shaped.code ?? shaped.errors?.[0]?.code
  }
  return undefined
}
