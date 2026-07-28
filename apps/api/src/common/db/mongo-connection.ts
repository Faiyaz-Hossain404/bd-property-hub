import { Logger } from '@nestjs/common';
import type { MongooseModuleFactoryOptions } from '@nestjs/mongoose';
import type { ConfigService } from '@nestjs/config';
import mongoose, { type Connection } from 'mongoose';
import { describeError } from '../errors/describe-error';
import { isTransientInfrastructureError } from '../errors/transient-error';

/**
 * A probe attempt is capped well below the runtime server-selection timeout so
 * the backoff loop cycles quickly instead of stalling ~10s per try on a database
 * that is simply not up yet.
 */
const MAX_PROBE_TIMEOUT_MS = 5_000;

export interface MongoRetrySettings {
  uri: string;
  dbName: string;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  serverSelectionTimeoutMs: number;
}

/** Seams for the unit tests — the defaults are the real driver and real clock. */
export interface MongoProbeDeps {
  probe(uri: string, timeoutMs: number): Promise<void>;
  sleep(ms: number): Promise<void>;
  random(): number;
}

/**
 * Exponential backoff with equal jitter: half the window is fixed so the delay
 * always grows, half is random so N instances restarting together do not
 * synchronise into a thundering herd against a database that is still booting.
 */
export function computeBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number = Math.random,
): number {
  const window = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(window / 2 + random() * (window / 2));
}

/**
 * Opens a throwaway connection to prove the server will actually answer, then
 * closes it. Deliberately not the app's connection: this must not leave a pool
 * behind, and it must be able to fail without poisoning Mongoose's state.
 */
async function probeMongo(uri: string, timeoutMs: number): Promise<void> {
  const client = new mongoose.mongo.MongoClient(uri, {
    serverSelectionTimeoutMS: timeoutMs,
    connectTimeoutMS: timeoutMs,
    maxPoolSize: 1,
    minPoolSize: 0,
  });
  try {
    await client.connect();
    await client.db().admin().ping();
  } finally {
    await client.close().catch(() => undefined);
  }
}

const defaultDeps: MongoProbeDeps = {
  probe: probeMongo,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};

/**
 * Waits for MongoDB to accept connections, retrying with exponential backoff.
 *
 * This exists for the restart race: the API container is up before the database
 * is, and without it the first connect fails and the process dies in a crash
 * loop. Only transient faults are retried — a bad URI or bad credentials fails
 * on the first attempt rather than burning the whole budget on an error that
 * will never resolve.
 *
 * Returns normally when the budget is exhausted rather than throwing, leaving
 * the final verdict to Mongoose's own connect so boot failures keep the one
 * error message operators already recognise.
 */
export async function waitForMongo(
  settings: MongoRetrySettings,
  logger: Pick<Logger, 'log' | 'warn'>,
  deps: MongoProbeDeps = defaultDeps,
): Promise<void> {
  const probeTimeoutMs = Math.min(settings.serverSelectionTimeoutMs, MAX_PROBE_TIMEOUT_MS);

  for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
    try {
      await deps.probe(settings.uri, probeTimeoutMs);
      if (attempt > 1) {
        logger.log(`MongoDB reachable after ${attempt} attempts.`);
      }
      return;
    } catch (error) {
      const { message } = describeError(error);

      if (!isTransientInfrastructureError(error)) {
        // Authentication failure, malformed URI, TLS rejection — retrying is
        // pointless and would only delay a boot that is going to fail anyway.
        logger.warn(`MongoDB rejected the connection for a non-transient reason: ${message}`);
        return;
      }

      if (attempt === settings.maxAttempts) {
        logger.warn(
          `MongoDB still unreachable after ${settings.maxAttempts} attempts: ${message}. Handing off to Mongoose.`,
        );
        return;
      }

      const delayMs = computeBackoffDelay(
        attempt,
        settings.baseDelayMs,
        settings.maxDelayMs,
        deps.random,
      );
      logger.warn(
        `MongoDB unreachable (attempt ${attempt}/${settings.maxAttempts}): ${message}. Retrying in ${delayMs}ms.`,
      );
      await deps.sleep(delayMs);
    }
  }
}

/**
 * Attaches lifecycle logging to the connection.
 *
 * The `error` listener is not optional decoration: a Mongoose `Connection` is an
 * EventEmitter, and an `'error'` event with no listener is re-thrown as an
 * uncaught exception. Subscribing here is what turns a mid-flight socket drop
 * into a log line instead of a dead process.
 */
export function attachConnectionLogging(connection: Connection, logger: Logger): void {
  connection.on('connected', () => logger.log('MongoDB connected.'));
  connection.on('reconnected', () => logger.log('MongoDB reconnected.'));
  connection.on('disconnected', () =>
    logger.warn(
      'MongoDB disconnected. The driver is reconnecting; queries buffer until it succeeds, then fail as 503.',
    ),
  );
  connection.on('close', () => logger.warn('MongoDB connection closed.'));
  connection.on('error', (error: unknown) =>
    logger.error(`MongoDB connection error: ${describeError(error).message}`),
  );
}

export function readRetrySettings(config: ConfigService): MongoRetrySettings {
  return {
    uri: config.getOrThrow<string>('MONGODB_URI'),
    dbName: config.getOrThrow<string>('MONGODB_DB_NAME'),
    maxAttempts: config.getOrThrow<number>('MONGO_CONNECT_MAX_ATTEMPTS'),
    baseDelayMs: config.getOrThrow<number>('MONGO_CONNECT_BASE_DELAY_MS'),
    maxDelayMs: config.getOrThrow<number>('MONGO_CONNECT_MAX_DELAY_MS'),
    serverSelectionTimeoutMs: config.getOrThrow<number>('MONGO_SERVER_SELECTION_TIMEOUT_MS'),
  };
}

/**
 * Builds the Mongoose options for `MongooseModule.forRootAsync`, waiting for the
 * database to come up first.
 *
 * Once connected, reconnection is the driver's job, not ours: the MongoDB driver
 * runs its own server-discovery monitor and reconnects indefinitely with its own
 * backoff, while Mongoose buffers operations in the meantime. Layering a manual
 * reconnect on top of that causes duplicate pools, so what is tuned here is how
 * long an operation is willing to wait before giving up — which is what turns a
 * blip into a 503 instead of a hung request.
 */
export async function createMongooseOptions(
  config: ConfigService,
  logger: Logger = new Logger('MongoConnection'),
): Promise<MongooseModuleFactoryOptions> {
  const settings = readRetrySettings(config);

  await waitForMongo(settings, logger);

  return {
    uri: settings.uri,
    dbName: settings.dbName,
    // Bounds how long any single operation waits for a healthy server. The
    // driver default is 30s, long enough for requests to pile up behind a blip.
    serverSelectionTimeoutMS: settings.serverSelectionTimeoutMs,
    // A small safety net only: `waitForMongo` above owns the retry policy, so
    // this covers just the narrow window where the database drops between the
    // successful probe and Mongoose's own connect.
    retryAttempts: 2,
    retryDelay: 1_000,
    verboseRetryLog: true,
    onConnectionCreate: (connection) => attachConnectionLogging(connection, logger),
  };
}
