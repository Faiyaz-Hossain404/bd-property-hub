import { Logger } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

// Derived from the interface so we don't deep-import a dist-only type.
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const ERROR_LOG_INTERVAL_MS = 30_000;
// Belt-and-suspenders: never let a connection string with credentials reach the
// logs, in case a non-Error rejection ever serializes the URL.
const REDIS_CREDENTIALS = /rediss?:\/\/[^@\s]*@/gi;

/**
 * Resilient wrapper around the Redis-backed throttler storage.
 *
 * The Redis store gives every API instance one shared rate-limit budget. But if
 * Redis becomes unreachable, its increment() rejects, and the global
 * ThrottlerGuard would then 500 *every* request — turning a Redis blip into a
 * full API outage. So on a storage error we degrade instead of failing: we fall
 * back to an in-memory store, which still enforces the limit *per instance*
 * (crucially, the tight auth brute-force limit keeps protecting login/register on
 * each box), just without the cross-instance total. Full shared enforcement
 * resumes automatically once Redis recovers.
 *
 * This is deliberately not a pure fail-open (which would drop rate limiting
 * entirely during an outage — handing an attacker unlimited credential-stuffing
 * by knocking over Redis) nor fail-closed (which would take the API down with
 * Redis). Per-instance degradation keeps the API up AND keeps a limit in force.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  // In-memory fallback used only while Redis is unreachable.
  private readonly fallback = new ThrottlerStorageService();
  private lastErrorLoggedAt = 0;

  constructor(private readonly redisStorage: ThrottlerStorageRedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.redisStorage.increment(key, ttl, limit, blockDuration, throttlerName);
    } catch (error) {
      this.logThrottled(error);
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  // Cap error logging to one line per interval so a sustained outage doesn't
  // flood the logs on every request.
  private logThrottled(error: unknown): void {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt < ERROR_LOG_INTERVAL_MS) return;
    this.lastErrorLoggedAt = now;
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.replace(REDIS_CREDENTIALS, 'redis://***@');
    this.logger.error(
      `Redis throttler storage unavailable — falling back to per-instance limits: ${message}`,
    );
  }
}
