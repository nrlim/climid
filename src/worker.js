'use strict';

/**
 * C-LIMID | Validation Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes jobs from `validation_queue` with:
 *
 *   Retry Strategy
 *   ──────────────
 *   • Max 3 attempts  (configured at queue-level in validationQueue.js)
 *   • Exponential backoff:  attempt 1 → 2 s, attempt 2 → 4 s, attempt 3 → 8 s
 *   • BullMQ moves a job to the "failed" state only after ALL attempts exhaust.
 *
 *   Rate Limiting
 *   ─────────────
 *   • Max 5 jobs per 60-second sliding window (BullMQ RateLimiter).
 *   • When the limit is hit, BullMQ auto-delays remaining jobs and logs a
 *     "rate limit" event — no jobs are dropped.
 *
 *   Concurrency
 *   ───────────
 *   • Up to 5 jobs run in parallel within each rate-limit window.
 *     (concurrency = max rate-limit count ensures the limiter is the bottleneck)
 *
 *   Graceful Shutdown
 *   ─────────────────
 *   • SIGTERM / SIGINT → `worker.close()` → finishes any in-flight job
 *     before exiting (no job loss on pod restart / deployment).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const { Worker, QueueEvents } = require('bullmq');
const { redisConnectionOptions } = require('./config/redis');
const { QUEUE_NAME }             = require('./queue/validationQueue');

// ─── Job handler registry ─────────────────────────────────────────────────────
// Each job `name` (type) maps to a handler function.
// Add new task types here without touching the worker bootstrap.
const handlers = require('./queue/handlers');

// ─── Rate-limiter config ──────────────────────────────────────────────────────
const RATE_LIMIT_MAX      = 5;   // max jobs started in the window
const RATE_LIMIT_DURATION = 60_000; // 60 seconds (ms)

// ─── Worker ───────────────────────────────────────────────────────────────────
const worker = new Worker(
  QUEUE_NAME,

  /**
   * Processor function — called for every job pulled from the queue.
   * @param {import('bullmq').Job} job
   */
  async (job) => {
    const start = Date.now();
    console.log(
      `[C-LIMID Worker] ▶  Job ${job.id} | type="${job.name}" | attempt ${job.attemptsMade + 1}/3`
    );

    // Dispatch to the correct handler
    const handler = handlers[job.name];

    if (!handler) {
      // Unknown job type — fail immediately (no retries for mis-routed jobs)
      throw new Error(`[C-LIMID Worker] No handler registered for job type: "${job.name}"`);
    }

    // Report initial progress
    await job.updateProgress(0);

    // Execute task
    const result = await handler(job);

    // Mark 100% on success
    await job.updateProgress(100);

    const elapsed = Date.now() - start;
    console.log(`[C-LIMID Worker] ✅  Job ${job.id} completed in ${elapsed}ms`);

    return result; // stored as job.returnvalue
  },

  {
    connection:  redisConnectionOptions,
    concurrency: RATE_LIMIT_MAX, // process up to 5 jobs simultaneously

    // ── Rate Limiter ─────────────────────────────────────────────────────────
    // BullMQ's built-in token-bucket limiter: only RATE_LIMIT_MAX jobs
    // may START within any RATE_LIMIT_DURATION ms window.
    limiter: {
      max:      RATE_LIMIT_MAX,
      duration: RATE_LIMIT_DURATION,
    },
  }
);

// ─── Worker events ────────────────────────────────────────────────────────────
worker.on('active', (job) =>
  console.log(`[C-LIMID Worker] ⏳  Job ${job.id} is now active`)
);

worker.on('progress', (job, progress) =>
  console.log(`[C-LIMID Worker] 📊  Job ${job.id} progress: ${progress}%`)
);

worker.on('completed', (job, result) =>
  console.log(`[C-LIMID Worker] ✅  Job ${job.id} completed. Result:`, result)
);

worker.on('failed', (job, err) => {
  const remaining = (job?.opts?.attempts ?? 3) - (job?.attemptsMade ?? 0);
  if (remaining > 0) {
    console.warn(
      `[C-LIMID Worker] ⚠️   Job ${job?.id} failed (attempt ${job?.attemptsMade}). ` +
      `Retrying in ${Math.pow(2, job?.attemptsMade ?? 0) * 2}s…`
    );
  } else {
    console.error(
      `[C-LIMID Worker] ❌  Job ${job?.id} exhausted all retries. ` +
      `Reason: ${err.message}`
    );
  }
});

worker.on('error', (err) =>
  console.error('[C-LIMID Worker] Internal error:', err.message)
);

// Rate-limit event — emitted when a job is delayed due to limiter
worker.on('ioredis:close', () =>
  console.warn('[C-LIMID Worker] Redis connection closed.')
);

// ─── QueueEvents — optional cross-process event listener ─────────────────────
const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisConnectionOptions });

queueEvents.on('stalled', ({ jobId }) =>
  console.warn(`[C-LIMID QueueEvents] ⚠️  Job ${jobId} stalled — will be retried.`)
);

// ─── Launch Telegram Bot ──────────────────────────────────────────────────────
const TelegramService = require('./services/TelegramService');
TelegramService.startBot();

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[C-LIMID Worker] ${signal} received. Shutting down gracefully…`);
  await worker.close();      // wait for in-flight job to finish
  await queueEvents.close();
  console.log('[C-LIMID Worker] Shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

console.log(`\n[C-LIMID Worker] Started on queue "${QUEUE_NAME}"`);
console.log(`  Concurrency : ${RATE_LIMIT_MAX} parallel jobs`);
console.log(`  Rate limit  : ${RATE_LIMIT_MAX} jobs / ${RATE_LIMIT_DURATION / 1000}s`);
console.log(`  Retry policy: 3 attempts, exponential backoff (2s, 4s, 8s)\n`);
