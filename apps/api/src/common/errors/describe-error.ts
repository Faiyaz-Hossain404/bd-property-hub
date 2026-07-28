/** A thrown value narrowed to the two things a log line actually needs. */
export interface ErrorDescription {
  message: string;
  stack?: string;
}

/**
 * Anything can be thrown or rejected in JavaScript, not just an `Error`. This
 * turns whatever arrived into a message (and a stack when there is one) without
 * ever throwing itself — a logging helper that can fail is worse than useless
 * inside a crash handler.
 */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) ?? String(error) };
  } catch {
    // Circular reference, a throwing toJSON, a BigInt — fall back to coercion.
    return { message: String(error) };
  }
}
