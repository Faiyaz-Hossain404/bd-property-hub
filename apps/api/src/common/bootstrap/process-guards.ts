import { describeError } from '../errors/describe-error';
import { isTransientInfrastructureError } from '../errors/transient-error';

/**
 * The subset of Nest's `Logger` these guards use. Narrow on purpose: a crash
 * handler should depend on as little as possible, and this is trivial to fake
 * in a test.
 */
export interface GuardLogger {
  warn(message: string): void;
  error(message: string, stack?: string): void;
}

export interface ProcessGuardOptions {
  logger: GuardLogger;
  /**
   * Invoked once, for an uncaught exception that is NOT a transient
   * infrastructure fault. The process is in an undefined state at that point,
   * so the caller is expected to drain and exit rather than carry on.
   */
  onFatal: (error: unknown) => void;
  /** Injection seam for tests; defaults to the real process. */
  target?: NodeJS.EventEmitter;
}

/** Lets callers detach the guards — used by tests, not by the running API. */
export interface ProcessGuards {
  dispose(): void;
}

/**
 * Installs the last-resort handlers for errors that escape Nest entirely.
 *
 * Without these, a socket error emitted by the Mongo or Redis driver outside any
 * request — during a failover, a restart, a network blip — reaches Node's
 * default handler and kills the process, taking every in-flight request with it.
 *
 * The two events are treated differently on purpose:
 *
 * `unhandledRejection` — a promise nobody awaited. The rest of the process is
 * unaffected, so it is always logged and never fatal. Registering a handler
 * suppresses Node's default of crashing on rejection, which is the point: a
 * fire-and-forget email send must not take down the API. Non-transient
 * rejections are logged at error level with a stack precisely because they are
 * real bugs that would otherwise be silently absorbed here.
 *
 * `uncaughtException` — an exception that unwound a whole stack. Node's docs are
 * explicit that resuming is unsafe, because the interrupted code may have left
 * state half-written. So it is survivable ONLY when the cause is a transient
 * network or database fault, where nothing application-level was mid-flight.
 * Anything else calls `onFatal` and the process should go down and be replaced.
 */
export function installProcessGuards(options: ProcessGuardOptions): ProcessGuards {
  const { logger, onFatal, target = process } = options;
  let fatalAlreadyHandled = false;

  const handleUnhandledRejection = (reason: unknown): void => {
    const { message, stack } = describeError(reason);
    if (isTransientInfrastructureError(reason)) {
      logger.warn(
        `Unhandled rejection from a transient infrastructure fault, staying up: ${message}`,
      );
      return;
    }
    logger.error(`Unhandled promise rejection: ${message}`, stack);
  };

  const handleUncaughtException = (error: unknown): void => {
    const { message, stack } = describeError(error);

    if (isTransientInfrastructureError(error)) {
      logger.warn(`Uncaught transient infrastructure fault, staying up: ${message}`);
      return;
    }

    // A second uncaught exception while the first is being drained must not
    // start a competing shutdown.
    if (fatalAlreadyHandled) {
      logger.error(`Uncaught exception during shutdown: ${message}`, stack);
      return;
    }
    fatalAlreadyHandled = true;

    logger.error(`Uncaught exception, shutting down: ${message}`, stack);
    onFatal(error);
  };

  target.on('unhandledRejection', handleUnhandledRejection);
  target.on('uncaughtException', handleUncaughtException);

  return {
    dispose(): void {
      target.off('unhandledRejection', handleUnhandledRejection);
      target.off('uncaughtException', handleUncaughtException);
    },
  };
}
