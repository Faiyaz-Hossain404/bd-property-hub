import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { describeError } from '../common/errors/describe-error';

// Maps Mongoose's numeric readyState (0|1|2|3|99) to a label.
const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

/**
 * Caps the ping so a database that accepts the socket but never answers cannot
 * hang the health check — a probe that hangs reads as "up" to most monitors.
 */
const PING_TIMEOUT_MS = 2_000;

export interface HealthReport {
  status: 'ok' | 'degraded';
  /** Coarse verdict, the field uptime monitors and load balancers key on. */
  db: 'connected' | 'disconnected';
  /** Fine-grained Mongoose readyState label, kept for existing consumers. */
  mongo: string;
  uptime: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check(): Promise<HealthReport> {
    const mongo = READY_STATES[this.connection.readyState] ?? 'unknown';
    const db = (await this.ping()) ? 'connected' : 'disconnected';

    return {
      status: db === 'connected' ? 'ok' : 'degraded',
      db,
      mongo,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * `readyState` only reports what the driver last believed. Issuing a real
   * command is the only way to know the database will answer, so this pings and
   * swallows the failure — the whole point is that an unreachable database
   * degrades the report instead of throwing out of the health endpoint.
   */
  private async ping(): Promise<boolean> {
    try {
      const db = this.connection.db;
      if (!db) {
        return false;
      }
      await withTimeout(db.admin().ping(), PING_TIMEOUT_MS);
      return true;
    } catch (error) {
      // Logged server-side, never returned: /health is unauthenticated and
      // exempt from the rate limit, so the body must not leak connection
      // strings, hostnames, or driver internals to anyone who asks.
      this.logger.warn(`Database ping failed: ${describeError(error).message}`);
      return false;
    }
  }
}

/**
 * `Promise.race` subscribes to both promises, so a late rejection from the
 * operation is still considered handled and cannot surface as an unhandled
 * rejection after the timeout has already won.
 */
async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
