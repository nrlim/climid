import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is standard for GCM

export class EncryptionService {
  private static getKey(): Buffer {
    let keyStr = process.env.ENCRYPTION_KEY;
    if (!keyStr) {
      throw new Error('ENCRYPTION_KEY environment variable is missing.');
    }
    
    // We expect a 32-byte (256-bit) key, e.g., represented as a 64-character hex string
    if (keyStr.length === 64) {
      return Buffer.from(keyStr, 'hex');
    }
    
    const key = Buffer.alloc(32);
    Buffer.from(keyStr, 'utf8').copy(key);
    return key;
  }

  /**
   * Encrypts the given plaintext.
   * @param text The string to encrypt.
   * @returns An object containing the base64-encoded encrypted hash, iv, and auth tag.
   */
  static encrypt(text: string) {
    const key = this.getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();

    return {
      hash: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypts the given hash.
   * @param hash The base64-encoded encrypted string.
   * @param iv The base64-encoded initialization vector.
   * @param tag The base64-encoded authentication tag.
   * @returns The decrypted plaintext.
   */
  static decrypt(hash: string, iv: string, tag: string) {
    const key = this.getKey();
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    let decrypted = decipher.update(hash, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
