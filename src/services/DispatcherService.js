'use strict';

/**
 * C-LIMID | Dispatcher Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Queries the secure_vault for all protected accounts, decrypts their payloads,
 * and enqueues them into BullMQ. Exported for use in scripts and Telegram bots.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/database');
const VaultService = require('./VaultService');
const { validationQueue } = require('../queue/validationQueue');

async function dispatchAll() {
  const vault = new VaultService();
  
  const res = await pool.query('SELECT id FROM secure_vault ORDER BY created_at ASC');
  const accountIds = res.rows.map(row => row.id);

  if (accountIds.length === 0) {
    return { count: 0, message: 'No accounts found in the vault.' };
  }

  let queued = 0;
  for (const id of accountIds) {
    try {
      const { accountEmail, payload } = await vault.retrieve(id);
      
      const jobData = {
        accountId: id,
        accountEmail,
        cookies: payload.cookies || [],
        password: payload.password || null, // from telegram /add_acc
        targetUrl: payload.targetUrl || 'https://one.google.com'
      };

      await validationQueue.add('playwright_audit', jobData, {
        jobId: `audit_${id}_${Date.now()}`,
        priority: 5,
      });
      queued++;
    } catch (err) {
      console.error(`[C-LIMID Dispatcher] Failed to enqueue account ${id}:`, err.message);
    }
  }

  return { count: queued, message: `Successfully dispatched ${queued} accounts to the queue.` };
}

module.exports = { dispatchAll };
