'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, MoreHorizontal, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import type { GoogleAccount } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatRelative, formatDateTime } from '@/lib/utils';
import { triggerSingleAudit } from '@/app/actions/queue';
import { deleteAccount } from '@/app/actions/vault';

interface AccountTableProps {
  accounts: GoogleAccount[];
  onRefresh: () => void;
}

function ActionMenu({
  account,
  onClose,
  onRefresh,
}: {
  account: GoogleAccount;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleTrigger = () => {
    startTransition(async () => {
      await triggerSingleAudit(account.id, account.email);
      onClose();
      onRefresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete ${account.email}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteAccount(account.id);
      onClose();
      onRefresh();
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        zIndex: 50,
        background: 'var(--clr-surface-2)',
        border: '1px solid var(--clr-border-2)',
        borderRadius: 10,
        padding: '6px',
        minWidth: 180,
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="btn btn-ghost"
        style={{ width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 6 }}
        onClick={handleTrigger}
        disabled={isPending}
      >
        <Play size={13} fill="currentColor" />
        Trigger Audit
      </button>
      {account.promoLink && (
        <a
          href={account.promoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 6 }}
          onClick={onClose}
        >
          <ExternalLink size={13} />
          View Promo
        </a>
      )}
      <div style={{ height: 1, background: 'var(--clr-border)', margin: '4px 0' }} />
      <button
        className="btn btn-danger"
        style={{ width: '100%', justifyContent: 'flex-start', border: 'none', borderRadius: 6 }}
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 size={13} />
        Delete Account
      </button>
    </motion.div>
  );
}

function EmailCell({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {email[0]?.toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--clr-text)' }}>
          {email}
        </div>
      </div>
      <button
        className="btn btn-icon"
        style={{ padding: '4px', marginLeft: 4 }}
        onClick={handleCopy}
        data-tooltip={copied ? 'Copied!' : 'Copy email'}
      >
        {copied ? <Check size={11} color="var(--clr-success)" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

export function AccountTable({ accounts, onRefresh }: AccountTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          padding: '60px 24px',
          textAlign: 'center',
          color: 'var(--clr-subtle)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--clr-muted)', marginBottom: 6 }}>
          No accounts in vault
        </div>
        <div style={{ fontSize: 13 }}>
          Add your first Google account to get started.
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="vault-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Status</th>
            <th>Last Audit</th>
            <th>Added</th>
            <th style={{ width: 48 }}></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {accounts.map((account, i) => (
              <motion.tr
                key={account.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => setOpenMenuId(null)}
              >
                <td>
                  <EmailCell email={account.email} />
                  {account.label && (
                    <div style={{ fontSize: 11, color: 'var(--clr-subtle)', marginTop: 2, paddingLeft: 36 }}>
                      {account.label}
                    </div>
                  )}
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={account.status} animate />
                  </div>
                </td>

                <td>
                  <span
                    style={{ color: 'var(--clr-muted)', fontSize: 12 }}
                    data-tooltip={formatDateTime(account.lastAuditAt)}
                  >
                    {formatRelative(account.lastAuditAt)}
                  </span>
                </td>

                <td>
                  <span style={{ color: 'var(--clr-subtle)', fontSize: 12 }}>
                    {formatRelative(account.createdAt)}
                  </span>
                </td>

                <td>
                  <div style={{ position: 'relative' }}>
                    <button
                      id={`account-menu-${account.id}`}
                      className="btn btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === account.id ? null : account.id);
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    <AnimatePresence>
                      {openMenuId === account.id && (
                        <ActionMenu
                          account={account}
                          onClose={() => setOpenMenuId(null)}
                          onRefresh={onRefresh}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
