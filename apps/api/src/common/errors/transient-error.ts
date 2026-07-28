/**
 * Tells "the infrastructure blinked" apart from "the code is wrong".
 *
 * A dropped socket, a database mid-restart, a connection pool torn down under a
 * running query — these resolve on their own and the process should ride them
 * out. A TypeError does not, and continuing past one risks serving corrupt state.
 *
 * Three places depend on the distinction:
 *  - `installProcessGuards` keeps the process alive for a transient fault but
 *    shuts down cleanly for a real one;
 *  - `AllExceptionsFilter` answers 503 + Retry-After instead of a flat 500, so
 *    the caller knows retrying is worthwhile;
 *  - the boot-time connection probe backs off and retries on a transient fault
 *    but fails fast on a bad URI or bad credentials.
 *
 * This API speaks to MongoDB, not Postgres. The Postgres signals map across as:
 * `ECONNREFUSED` is shared verbatim (it is a kernel socket error, not a database
 * one), and `57P03` "cannot_connect_now" — server up but refusing connections
 * while it starts or fails over — surfaces here as `MongoServerSelectionError`
 * or a cleared pool. Postgres SQLSTATEs are deliberately absent: this process
 * has no Postgres client that could ever raise one.
 */

/** Matched on `error.name`, which survives the driver being loaded twice. */
const TRANSIENT_ERROR_NAMES: ReadonlySet<string> = new Set([
  // MongoDB driver: no reachable server, socket died, or pool torn down.
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
  'MongoPoolClearedError',
  'MongoPoolClosedError',
  // Mongoose's wrapper around server selection failures.
  'MongooseServerSelectionError',
  // ioredis: Redis unreachable (throttler storage, chat gateway adapter).
  'MaxRetriesPerRequestError',
  'ClusterAllFailedError',
]);

/** Node syscall codes. `error.code` is a string here, never a Mongo error code. */
const TRANSIENT_SYSCALL_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED', // nothing listening yet — the database is still coming up
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENETDOWN',
  'ENOTFOUND', // SRV record not resolving during an Atlas failover
  'EAI_AGAIN', // transient DNS failure
]);

/**
 * The driver attaches this label to errors it considers safe to replay — most
 * importantly "not primary" during a replica set election, which arrives as a
 * plain MongoServerError and would otherwise look like an application fault.
 */
const RETRYABLE_ERROR_LABEL = 'RetryableWriteError';

/** Last resort for drivers that report a bare `Error` with a telling message. */
const TRANSIENT_MESSAGE_PATTERNS: readonly RegExp[] = [
  /buffering timed out/i, // Mongoose queued the op while disconnected, then gave up
  /topology (was destroyed|is closed)/i,
  /pool (was cleared|is closed)/i,
  /server is closed/i,
  /connection .{0,40}(closed|timed out)/i,
  /connection is closed/i, // ioredis
  /stream isn'?t writeable/i, // ioredis
];

/** Bounds the `cause` walk so a self-referencing chain cannot spin forever. */
const MAX_CAUSE_DEPTH = 5;

interface ErrorLike {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  cause?: unknown;
  errorLabels?: unknown;
}

/**
 * True when `error` looks like a recoverable network or database-connection
 * failure. Unwraps `cause` chains, since Mongoose and ioredis both wrap the
 * original socket error.
 */
export function isTransientInfrastructureError(error: unknown, depth = 0): boolean {
  if (error === null || typeof error !== 'object' || depth > MAX_CAUSE_DEPTH) {
    return false;
  }

  const candidate = error as ErrorLike;

  if (typeof candidate.name === 'string' && TRANSIENT_ERROR_NAMES.has(candidate.name)) {
    return true;
  }

  // Guarded on `string`: Mongo server errors carry a numeric `code` (11000 for a
  // duplicate key, say) that must never be mistaken for a syscall code.
  if (typeof candidate.code === 'string' && TRANSIENT_SYSCALL_CODES.has(candidate.code)) {
    return true;
  }

  if (Array.isArray(candidate.errorLabels) && candidate.errorLabels.includes(RETRYABLE_ERROR_LABEL)) {
    return true;
  }

  if (
    typeof candidate.message === 'string' &&
    TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(candidate.message as string))
  ) {
    return true;
  }

  return isTransientInfrastructureError(candidate.cause, depth + 1);
}
