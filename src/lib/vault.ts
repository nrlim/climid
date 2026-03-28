/**
 * C-LIMID | VaultService (TypeScript Port)
 */

import { prisma } from '@/lib/prisma';
import { EncryptionService } from '@/services/encryption';
import type { AccountCredentials } from '@/types';

export class VaultService {
  // ── Write ───────────────────────────────────────────────────────────────────

  /**
   * Encrypt credentials and persist them directly to the Account model.
   * Both password and cookies are independently encrypted into JSON string payloads.
   */
  async store(accountEmail: string, credentials: AccountCredentials): Promise<string> {
    this.validateEmail(accountEmail);

    let encryptedPasswordStr = null;
    let encryptedSessionStr = null;

    if (credentials.password) {
      const { hash, iv, tag } = EncryptionService.encrypt(credentials.password);
      encryptedPasswordStr = JSON.stringify({ hash, iv, tag });
    }

    if (credentials.cookies && credentials.cookies.length > 0) {
      const { hash, iv, tag } = EncryptionService.encrypt(JSON.stringify(credentials.cookies));
      encryptedSessionStr = JSON.stringify({ hash, iv, tag });
    }

    const entry = await prisma.account.update({
      where: { email: accountEmail },
      data: {
        password: encryptedPasswordStr ?? undefined,
        sessionJson: encryptedSessionStr ?? undefined,
      },
      select: { id: true },
    });

    console.log(`[VaultService] Stored vault credentials for ${accountEmail}`);
    return entry.id;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Retrieve and decrypt credentials for a given account.
   */
  async retrieve(accountEmail: string): Promise<{
    id: string;
    accountEmail: string;
    credentials: AccountCredentials;
    updatedAt: Date;
  }> {
    const entry = await prisma.account.findUnique({
      where: { email: accountEmail },
    });

    if (!entry) {
      throw new Error(`[VaultService] No vault credentials found for: ${accountEmail}`);
    }

    const credentials: AccountCredentials = {};

    if (entry.password) {
      try {
        const payload = JSON.parse(entry.password);
        credentials.password = EncryptionService.decrypt(payload.hash, payload.iv, payload.tag);
      } catch (e) {
         console.warn(`[Vault] Could not decrypt password for ${accountEmail}`);
      }
    }

    if (entry.sessionJson) {
      try {
        const payload = JSON.parse(entry.sessionJson);
        const decryptedJson = EncryptionService.decrypt(payload.hash, payload.iv, payload.tag);
        credentials.cookies = JSON.parse(decryptedJson);
      } catch (e) {
         console.warn(`[Vault] Could not decrypt session for ${accountEmail}`);
      }
    }

    return {
      id:          entry.id,
      accountEmail: entry.email,
      credentials,
      updatedAt:   entry.updatedAt,
    };
  }

  /**
   * Check if an account has secure credentials stored.
   */
  async hasCredentials(accountEmail: string): Promise<boolean> {
    this.validateEmail(accountEmail);

    const entry = await prisma.account.findUnique({
      where: { email: accountEmail },
      select: { password: true, sessionJson: true },
    });
    return !!(entry?.password || entry?.sessionJson);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private validateEmail(email: string): void {
    if (!email || !email.includes('@')) {
      throw new TypeError('[VaultService] accountEmail must be a valid email string.');
    }
  }

  static fromEnv(): VaultService {
    return new VaultService();
  }
}
