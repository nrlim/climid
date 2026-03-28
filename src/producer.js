'use strict';

/**
 * C-LIMID | Producer API — Express Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Exposes a REST API that lets any upstream service enqueue validation jobs.
 *
 * Endpoints
 * ──────────
 * POST /api/jobs/enqueue       — Add a new validation job to the queue.
 * GET  /api/jobs/:jobId/status — Poll the status of an existing job.
 * GET  /api/queue/metrics      — Live queue depth / counts snapshot.
 * GET  /health                 — Simple health-check (no Redis call).
 *
 * Design notes
 * ─────────────
 * • The API is stateless — all state lives in Redis / BullMQ.
 * • Every job is assigned a caller-supplied or auto-generated `jobId`
 *   (UUID v4) so clients can track their own jobs idempotently.
 * • Priority is accepted as an integer (1 = highest). BullMQ will
 *   process higher-priority jobs first within the same worker pool.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express             = require('express');
const cors                = require('cors');
const { v4: uuidv4 }      = require('uuid');
const { validationQueue } = require('./queue/validationQueue');
const { Queue }           = require('bullmq');
const { redisConnectionOptions } = require('./config/redis');

const app  = express();
const PORT = parseInt(process.env.API_PORT || '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[C-LIMID API] ${req.method} ${req.path}`);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
/**
 * GET /health
 * Returns 200 immediately — load balancers use this.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'c-limid-producer', timestamp: new Date().toISOString() });
});

// ─── POST /api/jobs/enqueue ───────────────────────────────────────────────────
/**
 * Enqueue a new validation job.
 *
 * Request body (JSON):
 * {
 *   "jobId"?:    string,   // optional caller-supplied idempotency key (UUID)
 *   "type":      string,   // task type, e.g. "email_validation", "kyc_check"
 *   "payload":   object,   // arbitrary task-specific data
 *   "priority"?: number    // 1 (highest) – 100 (lowest), default 10
 * }
 *
 * Response 202:
 * {
 *   "jobId":     string,
 *   "queueName": "validation_queue",
 *   "status":    "queued",
 *   "enqueuedAt": ISO timestamp
 * }
 */
app.post('/api/jobs/enqueue', async (req, res) => {
  const { type, payload, priority = 10 } = req.body;
  // Accept caller jobId for idempotency, fall back to auto-generated UUID
  const jobId = req.body.jobId || uuidv4();

  // ── Validation ───────────────────────────────────────────────────────────────
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: '`type` is required and must be a string.' });
  }
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: '`payload` is required and must be an object.' });
  }
  if (typeof priority !== 'number' || priority < 1 || priority > 100) {
    return res.status(400).json({ error: '`priority` must be a number between 1 and 100.' });
  }

  // ── Enqueue ──────────────────────────────────────────────────────────────────
  try {
    const job = await validationQueue.add(
      type,       // job name (BullMQ uses this for filtering/metrics)
      payload,    // data passed to the worker
      {
        jobId,    // idempotency key — BullMQ ignores duplicate jobIds
        priority,
        // Retry overrides (inherited from queue defaults if omitted):
        // attempts: 3, backoff: { type: 'exponential', delay: 2000 }
      }
    );

    console.log(`[C-LIMID API] Enqueued job ${job.id} (type="${type}", priority=${priority})`);

    return res.status(202).json({
      jobId:      job.id,
      queueName:  'validation_queue',
      status:     'queued',
      enqueuedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[C-LIMID API] Failed to enqueue job:', err.message);
    return res.status(500).json({ error: 'Failed to enqueue job. Redis may be unavailable.' });
  }
});

// ─── GET /api/jobs/:jobId/status ──────────────────────────────────────────────
/**
 * Poll the status/result of a previously enqueued job.
 *
 * Response 200:
 * {
 *   "jobId": string,
 *   "name":  string,
 *   "state": "waiting" | "active" | "completed" | "failed" | "delayed",
 *   "progress": number,
 *   "attemptsMade": number,
 *   "failedReason": string | null,
 *   "returnValue": any | null,
 *   "timestamps": { processedOn, finishedOn, createdAt }
 * }
 */
app.get('/api/jobs/:jobId/status', async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await validationQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job "${jobId}" not found.` });
    }

    const state        = await job.getState();
    const returnValue  = job.returnvalue ?? null;
    const failedReason = job.failedReason ?? null;

    return res.json({
      jobId:        job.id,
      name:         job.name,
      state,
      progress:     job.progress,
      attemptsMade: job.attemptsMade,
      failedReason,
      returnValue,
      timestamps: {
        createdAt:   new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn  ? new Date(job.processedOn).toISOString()  : null,
        finishedOn:  job.finishedOn   ? new Date(job.finishedOn).toISOString()   : null,
      },
    });
  } catch (err) {
    console.error('[C-LIMID API] Status check failed:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve job status.' });
  }
});

// ─── GET /api/queue/metrics ───────────────────────────────────────────────────
/**
 * Returns a live snapshot of the queue depth — useful for dashboards / autoscalers.
 */
app.get('/api/queue/metrics', async (_req, res) => {
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      validationQueue.getWaitingCount(),
      validationQueue.getActiveCount(),
      validationQueue.getCompletedCount(),
      validationQueue.getFailedCount(),
      validationQueue.getDelayedCount(),
      validationQueue.getPausedCount(),
    ]);

    return res.json({
      queue:     'validation_queue',
      snapshot:  new Date().toISOString(),
      counts:    { waiting, active, completed, failed, delayed, paused },
    });
  } catch (err) {
    console.error('[C-LIMID API] Metrics fetch failed:', err.message);
    return res.status(500).json({ error: 'Failed to fetch queue metrics.' });
  }
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[C-LIMID API] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n[C-LIMID Producer API] Listening on http://localhost:${PORT}`);
  console.log('  POST /api/jobs/enqueue        → Queue a validation job');
  console.log('  GET  /api/jobs/:id/status     → Poll job status');
  console.log('  GET  /api/queue/metrics       → Queue depth snapshot');
  console.log('  GET  /health                  → Health check\n');
});

module.exports = app; // export for testing
