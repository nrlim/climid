'use strict';

/**
 * C-LIMID | Redis Connection Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * BullMQ requires TWO separate ioredis connections:
 *   1. `redisConnection`  — for Queue and Worker instances (main I/O)
 *   2. QueueEvents uses a third internally
 *
 * ioredis is used directly because BullMQ does not support the `redis://`
 * URL string format natively in its `connection` option — it requires an
 * ioredis-compatible options object or an ioredis instance.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const { Redis } = require('ioredis');

const REDIS_HOST     = process.env.REDIS_HOST     || '127.0.0.1';
const REDIS_PORT     = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_TLS      = process.env.REDIS_TLS === 'true';

/**
 * Base options shared by every ioredis instance created for BullMQ.
 * BullMQ clones this object for its own connections, so we export
 * the plain options rather than a shared instance.
 */
const redisConnectionOptions = {
  host:               REDIS_HOST,
  port:               REDIS_PORT,
  password:           REDIS_PASSWORD,
  tls:                REDIS_TLS ? {} : undefined,
  maxRetriesPerRequest: null, // Required by BullMQ — disables ioredis auto-retry
  enableReadyCheck:   false,  // Required by BullMQ
  lazyConnect:        false,
};

/**
 * Factory — returns a fresh ioredis instance.
 * BullMQ expects a NEW connection per Queue / Worker / QueueEvents instance.
 */
function createRedisClient() {
  const client = new Redis(redisConnectionOptions);

  client.on('connect', () =>
    console.log(`[C-LIMID Redis] Connected → ${REDIS_HOST}:${REDIS_PORT}`)
  );
  client.on('error', (err) =>
    console.error('[C-LIMID Redis] Connection error:', err.message)
  );

  return client;
}

module.exports = { createRedisClient, redisConnectionOptions };
