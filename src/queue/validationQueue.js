'use strict';

/**
 * C-LIMID | Validation Queue — Initialisation
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports a singleton BullMQ Queue instance (`validation_queue`).
 * Producers (e.g. Express routes) import this to add jobs.
 *
 * Queue-level defaults:
 *   • removeOnComplete — keep last 200 completed jobs for auditing.
 *   • removeOnFail     — keep last 500 failed jobs for post-mortem analysis.
 *   • attempts         — 3 retries (overridable per job).
 *   • backoff          — exponential strategy (delay doubles each attempt).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Queue } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');

const QUEUE_NAME = 'validation_queue';

// ─── Retry defaults (applied to every job unless overridden) ─────────────────
const DEFAULT_JOB_OPTIONS = {
  attempts: 2, // Initial attempt + 1 retry
  backoff: {
    type:  'fixed',
    delay: 5000, // 5s wait before retry
  },
  removeOnComplete: { count: 200 },
  removeOnFail:     { count: 500 },
};

// ─── Queue singleton ─────────────────────────────────────────────────────────
const validationQueue = new Queue(QUEUE_NAME, {
  connection:   redisConnectionOptions,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

validationQueue.on('error', (err) =>
  console.error(`[C-LIMID Queue:${QUEUE_NAME}] Error:`, err.message)
);

console.log(`[C-LIMID Queue] "${QUEUE_NAME}" initialised.`);

module.exports = { validationQueue, QUEUE_NAME, DEFAULT_JOB_OPTIONS };
