'use strict';

/**
 * C-LIMID | VaultService
 * ─────────────────────────────────────────────────────────────────────────────
 * The single integration point between the encryption layer and PostgreSQL.
 *
 * Responsibilities:
 *   • Accept raw JSON objects (e.g. session cookies, user configs).
 *   • Serialise → encrypt → store in `secure_vault`.
 *   • Retrieve → decrypt → deserialise back to the original object.
 *   • Delete vault entries on logout / expiry.
 *
 * Usage:
 *   const vault = new VaultService();
 *   const id = await vault.store('user@example.com', { token: 'abc', role: 'admin' });
 *   const data = await vault.retrieve(id);
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const pool               = require('../config/database');
const { encryptData, decryptData } = require('../utils/encryption');

class VaultService {
  /**
   * @param {string} [masterKey]  Override the key at construction time (testing).
   *                              Defaults to VAULT_MASTER_KEY env var.
   */
  constructor(masterKey) {
    this._key = masterKey || process.env.VAULT_MASTER_KEY;

    if (!this._key) {
      throw new Error(
        '[C-LIMID VaultService] VAULT_MASTER_KEY is not set. ' +
        'Add it to your .env file as a 64-character hex string.'
      );
    }
  }

  // ─── Write ──────────────────────────────────────────────────────────────────

  /**
   * Encrypt a JSON payload and persist it for the given email.
   *
   * @param {string} accountEmail   Owner of this vault entry.
   * @param {object} payload        Any JSON-serialisable object.
   * @returns {Promise<string>}     The UUID of the newly created vault row.
   */
  async store(accountEmail, payload) {
    this._validateEmail(accountEmail);

    if (payload === null || typeof payload !== 'object') {
      throw new TypeError('[C-LIMID VaultService] payload must be a non-null object.');
    }

    const plainText = JSON.stringify(payload);
    const { encryptedBlob, iv, authTag } = encryptData(plainText, this._key);

    const sql = `
      INSERT INTO secure_vault (account_email, encrypted_blob, initialization_vector, auth_tag)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const { rows } = await pool.query(sql, [accountEmail, encryptedBlob, iv, authTag]);
    const vaultId = rows[0].id;

    console.log(`[C-LIMID VaultService] Stored vault entry ${vaultId} for ${accountEmail}`);
    return vaultId;
  }

  // ─── Read ───────────────────────────────────────────────────────────────────

  /**
   * Retrieve and decrypt a vault entry by its UUID.
   *
   * @param {string} vaultId   UUID of the vault row.
   * @returns {Promise<{
   *   id: string,
   *   accountEmail: string,
   *   payload: object,
   *   createdAt: Date
   * }>}
   */
  async retrieve(vaultId) {
    const sql = `
      SELECT id, account_email, encrypted_blob, initialization_vector, auth_tag, created_at
      FROM   secure_vault
      WHERE  id = $1
    `;

    const { rows } = await pool.query(sql, [vaultId]);

    if (rows.length === 0) {
      throw new Error(`[C-LIMID VaultService] No vault entry found for id: ${vaultId}`);
    }

    const row = rows[0];
    const plainText = decryptData(
      row.encrypted_blob,
      this._key,
      row.initialization_vector,
      row.auth_tag
    );

    return {
      id:           row.id,
      accountEmail: row.account_email,
      payload:      JSON.parse(plainText),
      createdAt:    row.created_at,
    };
  }

  /**
   * List all vault entry IDs + timestamps for an account (no decryption).
   *
   * @param {string} accountEmail
   * @returns {Promise<Array<{ id: string, createdAt: Date }>>}
   */
  async listByEmail(accountEmail) {
    this._validateEmail(accountEmail);

    const sql = `
      SELECT id, created_at
      FROM   secure_vault
      WHERE  account_email = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(sql, [accountEmail]);
    return rows.map((r) => ({ id: r.id, createdAt: r.created_at }));
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Permanently delete a vault entry.
   *
   * @param {string} vaultId
   * @returns {Promise<boolean>}  true if a row was deleted, false if not found.
   */
  async delete(vaultId) {
    const sql = 'DELETE FROM secure_vault WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(sql, [vaultId]);

    const deleted = rows.length > 0;
    if (deleted) {
      console.log(`[C-LIMID VaultService] Deleted vault entry ${vaultId}`);
    }
    return deleted;
  }

  /**
   * Permanently delete ALL vault entries for an account (e.g. account closure).
   *
   * @param {string} accountEmail
   * @returns {Promise<number>}  Number of rows deleted.
   */
  async deleteByEmail(accountEmail) {
    this._validateEmail(accountEmail);

    const sql = 'DELETE FROM secure_vault WHERE account_email = $1 RETURNING id';
    const { rows } = await pool.query(sql, [accountEmail]);

    console.log(`[C-LIMID VaultService] Deleted ${rows.length} vault entries for ${accountEmail}`);
    return rows.length;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _validateEmail(email) {
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new TypeError('[C-LIMID VaultService] accountEmail must be a valid email string.');
    }
  }
}

module.exports = VaultService;
