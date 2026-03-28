'use strict';

/**
 * C-LIMID | Database Configuration
 * Exports a PostgreSQL connection pool sourced from the DATABASE_URL env var.
 */

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('[C-LIMID] DATABASE_URL is not set. Check your .env file.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Recommended production settings
  max: 10,                  // max pool size
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  console.error('[C-LIMID DB] Unexpected client error:', err.message);
});

module.exports = pool;
