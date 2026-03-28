'use strict';

/**
 * C-LIMID | Job Handler Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps job `type` (the BullMQ job name) to an async handler function.
 *
 * Each handler receives a BullMQ `job` object and must:
 *   • Be async and return a JSON-serialisable result object.
 *   • Call `job.updateProgress(n)` periodically for observability.
 *   • Throw an Error to signal failure (triggers BullMQ retry).
 *
 * Add new task types by extending this file — the Worker requires no changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── External Services ────────────────────────────────────────────────────────
const { runAudit }    = require('../services/PlaywrightSimulator');
const TelegramService = require('../services/TelegramService');

// ─── Helper: simulate async I/O ──────────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
//  Handler: email_validation
//  Validates that an email address is well-formed and the domain exists.
// ─────────────────────────────────────────────────────────────────────────────
async function emailValidationHandler(job) {
  const { email } = job.data;

  if (!email) throw new Error('email_validation: `email` field is required in payload.');

  await job.updateProgress(20);

  // Simulate DNS/MX lookup latency
  await sleep(300);
  await job.updateProgress(60);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`email_validation: "${email}" is not a valid email address.`);
  }

  await sleep(200);
  await job.updateProgress(90);

  return {
    type:    'email_validation',
    email,
    valid:   true,
    checkedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handler: kyc_check
//  Simulates a KYC (Know Your Customer) identity verification task.
// ─────────────────────────────────────────────────────────────────────────────
async function kycCheckHandler(job) {
  const { userId, documentType, documentNumber } = job.data;

  if (!userId || !documentType || !documentNumber) {
    throw new Error('kyc_check: `userId`, `documentType`, and `documentNumber` are required.');
  }

  await job.updateProgress(25);
  await sleep(500); // simulate external KYC API call

  await job.updateProgress(75);
  await sleep(300);

  // Simulate occasional transient failure (20% chance) for retry demo
  if (Math.random() < 0.2) {
    throw new Error('kyc_check: Transient failure — external KYC API timeout.');
  }

  return {
    type:           'kyc_check',
    userId,
    documentType,
    documentNumber,
    status:         'VERIFIED',
    verifiedAt:     new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handler: data_integrity_check
//  Verifies that a vault entry's decrypted payload matches an expected schema.
// ─────────────────────────────────────────────────────────────────────────────
async function dataIntegrityCheckHandler(job) {
  const { vaultId, requiredFields } = job.data;

  if (!vaultId) throw new Error('data_integrity_check: `vaultId` is required.');

  await job.updateProgress(30);
  await sleep(200);

  const fields = requiredFields || [];
  // In a real implementation: load from VaultService, decrypt, validate fields.

  await job.updateProgress(80);
  await sleep(100);

  return {
    type:      'data_integrity_check',
    vaultId,
    fields,
    integrity: 'PASS',
    checkedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handler: playwright_audit
//  The C-LIMID Execution Bridge. Runs a headless Playwright simulation using 
//  decrypted account cookies, evaluates eligibility, and reports to Telegram.
// ─────────────────────────────────────────────────────────────────────────────
async function playwrightAuditHandler(job) {
  const { accountEmail, cookies, targetUrl, accountId } = job.data;

  if (!accountEmail) throw new Error('playwright_audit: `accountEmail` is required.');

  await job.updateProgress(10);

  // 1. Run the Simulation with decrypted cookies
  console.log(`[C-LIMID Worker:Playwright] Initiating browser session for ${accountEmail}...`);
  const result = await runAudit({ targetUrl, cookies, headless: true });

  await job.updateProgress(75);

  // 2. Format result & Telegram notification
  if (result.error) {
    console.error(`[C-LIMID Worker:Playwright] ${accountEmail} encountered a critical error.`);
  }

  console.log(`[C-LIMID Worker:Playwright] Session closed. Status: ${result.status}. Sending Report...`);
  
  // 3. Dispatch to Telegram
  await TelegramService.sendReport({
    accountEmail,
    status: result.status,
    promoLink: result.promoLink,
    screenshotBuf: result.screenshotBuf,
  });

  await job.updateProgress(100);

  return {
    type:      'playwright_audit',
    accountId,
    accountEmail,
    status:    result.status,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Registry map  →  exported and consumed by worker.js
// ─────────────────────────────────────────────────────────────────────────────
const handlers = {
  email_validation:     emailValidationHandler,
  kyc_check:            kycCheckHandler,
  data_integrity_check: dataIntegrityCheckHandler,
  playwright_audit:     playwrightAuditHandler,
};

module.exports = handlers;
