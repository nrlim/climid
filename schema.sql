-- ============================================================
--  C-LIMID  |  Secure Vault Schema
--  Run this once on your PostgreSQL database to initialise
--  the encrypted-data store.
-- ============================================================

-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop table if re-running for a fresh setup (comment out in prod)
-- DROP TABLE IF EXISTS secure_vault;

CREATE TABLE IF NOT EXISTS secure_vault (
    id                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    account_email        TEXT         NOT NULL,
    encrypted_blob       TEXT         NOT NULL,   -- AES-256-GCM ciphertext (base64)
    initialization_vector TEXT        NOT NULL,   -- 12-byte IV (base64)
    auth_tag             TEXT         NOT NULL,   -- 16-byte GCM auth tag (base64)
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_secure_vault PRIMARY KEY (id),
    CONSTRAINT chk_email       CHECK (account_email ~* '^[^@]+@[^@]+\.[^@]+$')
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_vault_email ON secure_vault (account_email);

COMMENT ON TABLE  secure_vault                  IS 'Zero-knowledge encrypted blob store for C-LIMID session data.';
COMMENT ON COLUMN secure_vault.encrypted_blob   IS 'AES-256-GCM ciphertext, Base64-encoded.';
COMMENT ON COLUMN secure_vault.initialization_vector IS 'Random 12-byte IV used during encryption, Base64-encoded.';
COMMENT ON COLUMN secure_vault.auth_tag         IS 'GCM authentication tag (16 bytes), Base64-encoded. Required for decryption.';
