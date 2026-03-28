'use strict';

/**
 * C-LIMID | Encryption Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Algorithm : AES-256-GCM  (Authenticated Encryption with Associated Data)
 * IV size   : 12 bytes  (96-bit — NIST recommended for GCM)
 * Tag size  : 16 bytes  (128-bit authentication tag)
 * Key size  : 32 bytes  (256-bit, supplied as 64-char hex string)
 *
 * Why GCM?
 *   • Confidentiality  — ciphertext reveals nothing about the plaintext.
 *   • Integrity        — the auth-tag detects any tampering with the ciphertext.
 *   • Authenticity     — decryption fails loudly if IV, key, or blob are wrong.
 *
 * IMPORTANT: Never reuse an (IV, Key) pair. A fresh random IV is generated for
 * every encryption call, so duplicate plaintexts still produce different blobs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');

const ALGORITHM  = 'aes-256-gcm';
const IV_LENGTH  = 12; // bytes — 96-bit IV, optimal for GCM
const TAG_LENGTH = 16; // bytes — 128-bit authentication tag

/**
 * Derive a 32-byte Buffer from a hex key string.
 * @param {string} hexKey  64-char hex string representing the 256-bit master key.
 * @returns {Buffer}
 */
function _resolveKey(hexKey) {
  if (typeof hexKey !== 'string' || hexKey.length !== 64) {
    throw new Error(
      '[C-LIMID] VAULT_MASTER_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hexKey, 'hex');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param {string} plainText   The sensitive string to encrypt.
 * @param {string} secretKey   64-char hex master key (from VAULT_MASTER_KEY env).
 * @returns {{
 *   encryptedBlob: string,   // Base64-encoded ciphertext
 *   iv: string,              // Base64-encoded 12-byte IV
 *   authTag: string          // Base64-encoded 16-byte GCM auth tag
 * }}
 */
function encryptData(plainText, secretKey) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new Error('[C-LIMID] encryptData: plainText must be a non-empty string.');
  }

  const keyBuffer = _resolveKey(secretKey);
  const iv        = crypto.randomBytes(IV_LENGTH); // fresh IV every call

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag(); // must be called AFTER cipher.final()

  return {
    encryptedBlob: encrypted.toString('base64'),
    iv:            iv.toString('base64'),
    authTag:       authTag.toString('base64'),
  };
}

/**
 * Decrypt a ciphertext that was produced by `encryptData`.
 *
 * @param {string} encryptedBlob   Base64-encoded ciphertext.
 * @param {string} secretKey       64-char hex master key.
 * @param {string} iv              Base64-encoded IV used during encryption.
 * @param {string} authTag         Base64-encoded GCM authentication tag.
 * @returns {string}               The original plaintext string.
 * @throws {Error}                 If the tag verification fails (tampered data).
 */
function decryptData(encryptedBlob, secretKey, iv, authTag) {
  if (!encryptedBlob || !secretKey || !iv || !authTag) {
    throw new Error('[C-LIMID] decryptData: all four arguments are required.');
  }

  const keyBuffer      = _resolveKey(secretKey);
  const ivBuffer       = Buffer.from(iv, 'base64');
  const authTagBuffer  = Buffer.from(authTag, 'base64');
  const cipherBuffer   = Buffer.from(encryptedBlob, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer, {
    authTagLength: TAG_LENGTH,
  });

  // Set the auth tag BEFORE calling decipher.update / decipher.final
  decipher.setAuthTag(authTagBuffer);

  try {
    const decrypted = Buffer.concat([
      decipher.update(cipherBuffer),
      decipher.final(), // throws if auth tag doesn't match → tamper detection
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    // Re-throw with a clear, safe message (never expose key details in errors)
    throw new Error(
      '[C-LIMID] Decryption failed — data may be tampered with or the wrong key was used.'
    );
  }
}

module.exports = { encryptData, decryptData };
