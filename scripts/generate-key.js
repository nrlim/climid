'use strict';

/**
 * C-LIMID | Key Generator Script
 * Run once to generate a cryptographically secure VAULT_MASTER_KEY.
 *
 * Usage:
 *   node scripts/generate-key.js
 */

const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('hex');

console.log('\n══════════════════════════════════════════════════════');
console.log('  C-LIMID  |  AES-256-GCM Master Key Generator');
console.log('══════════════════════════════════════════════════════\n');
console.log('  Your new VAULT_MASTER_KEY (64-char hex / 256-bit):\n');
console.log(`  VAULT_MASTER_KEY=${key}`);
console.log('\n  ⚠️  Keep this secret. Store it in a secrets manager');
console.log('  (e.g. AWS Secrets Manager, HashiCorp Vault, .env).');
console.log('  Losing this key means all encrypted data is inaccessible.');
console.log('\n══════════════════════════════════════════════════════\n');
