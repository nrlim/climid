/**
 * C-LIMID | BullMQ Queue Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared queue instance for the Next.js API routes (producer side only).
 * The actual Worker is in /workers/validation.worker.ts — a separate process.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUE_NAME = 'validation_queue';

// ── Redis connection ──────────────────────────────────────────────────────────
// Lazy singleton — created once per Node.js process.
let _redis: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_redis) {
    _redis = new IORedis({
      host:    process.env.REDIS_HOST ?? '127.0.0.1',
      port:    parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD ?? undefined,
      tls:     process.env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
    });
  }
  return _redis;
}

// ── Queue singleton ────────────────────────────────────────────────────────────
let _queue: Queue | null = null;

export function getValidationQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 50 },
      },
    });
  }
  return _queue;
}
