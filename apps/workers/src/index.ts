import 'dotenv/config';
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';

// Build connection options from REDIS_URL and let BullMQ own its client (and
// its pinned ioredis). Importing ioredis directly here would pull a second
// copy and clash with BullMQ's bundled version at the type level.
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  // BullMQ requires this for its blocking commands.
  maxRetriesPerRequest: null,
};

/**
 * Lifecycle queue — unresponsive-seller sweeps, sold/expired cleanup, and the
 * other automated jobs from DEVELOPMENT_ROADMAP.md Phase 4. Real handlers are
 * added per directive later; this stub establishes the queue + worker wiring.
 */
export const lifecycleQueue = new Queue('lifecycle', { connection });

const worker = new Worker(
  'lifecycle',
  async (job: Job) => {
    return { handled: job.name };
  },
  { connection },
);

worker.on('ready', () => {
  console.log('[workers] lifecycle worker ready');
});

worker.on('failed', (job, err) => {
  console.error(`[workers] job ${job?.id ?? 'unknown'} failed: ${err.message}`);
});
