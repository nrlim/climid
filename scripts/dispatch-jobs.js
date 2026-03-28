'use strict';

/**
 * C-LIMID | Job Dispatcher (DB -> Queue)
 * ─────────────────────────────────────────────────────────────────────────────
 * The "Brain" of the C-LIMID workflow.
 * 
 * 1. Queries the secure_vault for all protected accounts.
 * 2. Decrypts their associated state/cookies.
 * 3. Enqueues a 'playwright_audit' job into BullMQ for processing.
 * 
 * Usage: node scripts/dispatch-jobs.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { dispatchAll } = require('../src/services/DispatcherService');
const pool = require('../src/config/database');
const { validationQueue } = require('../src/queue/validationQueue');

async function runCLI() {
  console.log('\n[C-LIMID Dispatcher] Locating encrypted accounts from Secure Vault...');
  try {
    const result = await dispatchAll();
    console.log(`\n[C-LIMID Dispatcher] ${result.message}`);
  } catch (err) {
    console.error('[C-LIMID Dispatcher] Fatal error during dispatch:', err.message);
  } finally {
    await pool.end();
    await validationQueue.close(); 
    process.exit(0);
  }
}
runCLI();
