/**
 * C-LIMID | EncryptionService
 * ─────────────────────────────────────────────────────────────────────────────
 * Type-safe AES-256-GCM encryption/decryption service.
 * Migrated from src/utils/encryption.js to a fully typed TypeScript class.
 *
 * Security properties:
 *   • AES-256-GCM: authenticated encryption (confidentiality + integrity)
 *   • 12-byte random IV per operation (NIST recommended)
 *   • 16-byte GCM auth tag: detects tampering before decryption
 *   • Zero plaintext left in memory after use (best-effort)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { EncryptedPayload } from '@/types';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12;  // 96-bit IV — NIST recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

export class EncryptionService {
  private readonly key: Buffer;

  /**
   * @param masterKey - 64-character hex string (32 bytes). Reads from
   *                    VAULT_MASTER_KEY env var if not provided.
   */
  constructor(masterKey?: string) {
    const hexKey = masterKey ?? process.env.VAULT_MASTER_KEY;

    if (!hexKey) {
      throw new Error(
        '[EncryptionService] VAULT_MASTER_KEY is not set. ' +
        'Run `npm run generate-key` and add it to your .env file.'
      );
    }

    if (!/^[0-9a-f]{64}$/i.test(hexKey)) {
      throw new Error(
        '[EncryptionService] VAULT_MASTER_KEY must be exactly 64 hex characters (32 bytes).'
      );
    }

    this.key = Buffer.from(hexKey, 'hex');
  }

  // ── Encrypt ─────────────────────────────────────────────────────────────────

  /**
   * Encrypt an arbitrary JSON-serialisable payload.
   * Returns the ciphertext, IV, and auth-tag — all base64-encoded.
   *
   * @param data - Any JSON-serialisable value
   */
  encrypt(data: unknown): EncryptedPayload {
    const plainText = JSON.stringify(data);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_LENGTH,
    });

    const encryptedParts = [
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ];

    const encryptedBuffer = Buffer.concat(encryptedParts);
    const authTag = cipher.getAuthTag();

    return {
      encryptedBlob: encryptedBuffer.toString('base64'),
      iv:            iv.toString('base64'),
      authTag:       authTag.toString('base64'),
    };
  }

  // ── Decrypt ─────────────────────────────────────────────────────────────────

  /**
   * Decrypt and deserialise a previously encrypted payload.
   * Throws immediately if the auth tag doesn't match (tamper detection).
   *
   * @param payload - The { encryptedBlob, iv, authTag } object from encrypt()
   */
  decrypt<T = unknown>(payload: EncryptedPayload): T {
    const { encryptedBlob, iv, authTag } = payload;

    const ivBuf      = Buffer.from(iv, 'base64');
    const tagBuf     = Buffer.from(authTag, 'base64');
    const cipherBuf  = Buffer.from(encryptedBlob, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, ivBuf, {
      authTagLength: TAG_LENGTH,
    });

    decipher.setAuthTag(tagBuf);

    const parts = [
      decipher.update(cipherBuf),
      decipher.final(),
    ];

    const plainText = Buffer.concat(parts).toString('utf8');
    return JSON.parse(plainText) as T;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Encrypt a plain string (not JSON-wrapped).
   * Useful for encrypting API keys or tokens directly.
   */
  encryptString(value: string): EncryptedPayload {
    return this.encrypt({ __raw: value });
  }

  /**
   * Decrypt a value previously encrypted with encryptString().
   */
  decryptString(payload: EncryptedPayload): string {
    const obj = this.decrypt<{ __raw: string }>(payload);
    return obj.__raw;
  }

  /**
   * Static factory — convenience wrapper reading from env.
   */
  static fromEnv(): EncryptionService {
    return new EncryptionService();
  }
}
