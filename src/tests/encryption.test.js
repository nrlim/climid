'use strict';

/**
 * C-LIMID | Encryption Utility — Unit Tests
 * Run with:  node src/tests/encryption.test.js
 *
 * No external test framework required — uses Node's built-in assert module.
 */

const assert               = require('assert');
const { encryptData, decryptData } = require('../utils/encryption');

// ─── Generate a valid test key (32 random bytes → 64 hex chars) ──────────────
const crypto  = require('crypto');
const TEST_KEY = crypto.randomBytes(32).toString('hex');

// ─── Helper ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(title, fn) {
  try {
    fn();
    console.log(`  ✅  ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${title}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('  C-LIMID  |  AES-256-GCM Encryption Test Suite');
console.log('═══════════════════════════════════════════════════════\n');

// 1. Basic round-trip
test('Encrypted then decrypted value matches original plaintext', () => {
  const plainText = 'Hello, C-LIMID Secure Vault!';
  const { encryptedBlob, iv, authTag } = encryptData(plainText, TEST_KEY);
  const result = decryptData(encryptedBlob, TEST_KEY, iv, authTag);
  assert.strictEqual(result, plainText);
});

// 2. JSON payload round-trip
test('JSON object survives encryption / decryption round-trip', () => {
  const payload = { userId: 'u123', role: 'admin', token: 'abc.def.ghi', exp: 9999999 };
  const plainText = JSON.stringify(payload);
  const { encryptedBlob, iv, authTag } = encryptData(plainText, TEST_KEY);
  const result = JSON.parse(decryptData(encryptedBlob, TEST_KEY, iv, authTag));
  assert.deepStrictEqual(result, payload);
});

// 3. Same plaintext → different ciphertext each call (IV randomness)
test('Encrypting the same plaintext twice produces different ciphertexts', () => {
  const plainText = 'determinism-check';
  const r1 = encryptData(plainText, TEST_KEY);
  const r2 = encryptData(plainText, TEST_KEY);
  assert.notStrictEqual(r1.encryptedBlob, r2.encryptedBlob, 'Ciphertexts must differ');
  assert.notStrictEqual(r1.iv, r2.iv, 'IVs must differ');
});

// 4. Tampered ciphertext → decryption throws
test('Tampered ciphertext causes decryption to throw', () => {
  const { encryptedBlob, iv, authTag } = encryptData('secret', TEST_KEY);
  const tampered = Buffer.from(encryptedBlob, 'base64');
  tampered[0] ^= 0xff; // flip all bits in first byte
  assert.throws(
    () => decryptData(tampered.toString('base64'), TEST_KEY, iv, authTag),
    /Decryption failed/
  );
});

// 5. Wrong key → decryption throws
test('Wrong master key causes decryption to throw', () => {
  const { encryptedBlob, iv, authTag } = encryptData('secret', TEST_KEY);
  const wrongKey = crypto.randomBytes(32).toString('hex');
  assert.throws(
    () => decryptData(encryptedBlob, wrongKey, iv, authTag),
    /Decryption failed/
  );
});

// 6. Empty plaintext → throws
test('Empty plaintext string throws during encryption', () => {
  assert.throws(() => encryptData('', TEST_KEY), /non-empty string/);
});

// 7. Invalid key length → throws
test('Key shorter than 64 hex chars throws during encryption', () => {
  assert.throws(() => encryptData('test', 'tooshort'), /64-character/);
});

// 8. Missing decryption arguments → throws
test('Missing authTag during decryption throws', () => {
  const { encryptedBlob, iv } = encryptData('test', TEST_KEY);
  assert.throws(() => decryptData(encryptedBlob, TEST_KEY, iv, null), /required/);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
