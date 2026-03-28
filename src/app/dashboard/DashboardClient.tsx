'use client';

import { useState, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Activity, RefreshCw, ShieldCheck } from 'lucide-react';
import type { GoogleAccount } from '@/types';
import { StatCards } from '@/components/StatCards';
import { AccountTable } from '@/components/AccountTable';
import { RunAllButton } from '@/components/RunAllButton';
import { AddAccountModal } from '@/components/AddAccountModal';
import { LiveLogsDrawer } from '@/components/LiveLogsDrawer';
import { computeStats } from '@/lib/utils';
import { getAccounts } from '@/app/actions/vault';

interface DashboardClientProps {
  initialAccounts: GoogleAccount[];
}

export function DashboardClient({ initialAccounts }: DashboardClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const stats = computeStats(accounts);

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const result = await getAccounts();
      if (result.success) {
        setAccounts(result.data);
      }
    });
  }, []);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              marginBottom: 4,
              background: 'linear-gradient(135deg, #f9fafb 0%, #9ca3af 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Account Inventory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--clr-subtle)' }}>
            {stats.total} accounts · {stats.eligible} eligible · AES-256-GCM encrypted
          </p>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            id="refresh-accounts-btn"
            className="btn btn-ghost"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <motion.span
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
            >
              <RefreshCw size={13} />
            </motion.span>
            Refresh
          </button>

          <button
            id="open-logs-btn"
            className="btn btn-ghost"
            onClick={() => setShowLogs(true)}
          >
            <Activity size={13} />
            Live Logs
          </button>

          <button
            id="add-account-btn"
            className="btn btn-ghost"
            onClick={() => setShowAddModal(true)}
            style={{ borderColor: 'rgba(99,102,241,0.3)', color: 'var(--clr-accent-2)' }}
          >
            <Plus size={13} />
            Add Account
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <div style={{ marginBottom: 28 }}>
        <StatCards stats={stats} />
      </div>

      {/* Global Action Center */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{
          padding: '20px 24px',
          borderRadius: 16,
          marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} color="var(--clr-accent-2)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
              Global Action Center
            </div>
            <div style={{ fontSize: 12, color: 'var(--clr-subtle)' }}>
              Dispatch Playwright audits for all accounts simultaneously
            </div>
          </div>
        </div>

        <RunAllButton accountCount={stats.total} />
      </motion.div>

      {/* Inventory Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
        }}
      >
        {/* Table header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text)' }}>
            Vault Inventory
          </div>
          <div style={{ fontSize: 12, color: 'var(--clr-subtle)' }}>
            {accounts.length} accounts
          </div>
        </div>

        <AccountTable accounts={accounts} onRefresh={refresh} />
      </motion.div>

      {/* Modals & Drawers */}
      <AnimatePresence>
        {showAddModal && (
          <AddAccountModal
            onClose={() => setShowAddModal(false)}
            onSuccess={refresh}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogs && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogs(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 99,
              }}
            />
            <LiveLogsDrawer onClose={() => setShowLogs(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
