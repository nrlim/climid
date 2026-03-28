import React from 'react';
import { ShieldAlert, Key } from 'lucide-react';

export default function VaultPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: '8px' }}>
          Secure Vault Configuration
        </h1>
        <p style={{ color: 'var(--clr-muted)', fontSize: '14px' }}>
          Manage your zero-knowledge encryption settings and master keys.
        </p>
      </div>

      <div className="glass" style={{ padding: '32px', borderRadius: '16px', border: '1px solid var(--clr-border-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#8b5cf6' }}>
            <Key size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--clr-text)' }}>Master Encryption Key</h3>
            <p style={{ fontSize: '13px', color: 'var(--clr-subtle)' }}>AES-256-GCM is currently active and securing all account credentials.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
          <ShieldAlert size={16} color="#ef4444" />
          <span style={{ fontSize: '13px', color: '#ef4444' }}>Key rotation is performed automatically via the CLI. Manual UI rotation is disabled for security.</span>
        </div>
      </div>
    </div>
  );
}
