import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AccountStatus, DashboardStats, GoogleAccount } from '@/types';

// ── Tailwind class merging ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Status helpers ────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  AccountStatus,
  { label: string; color: string; dot: string; bg: string }
> = {
  PENDING:        { label: 'Pending',          color: 'text-zinc-400',   dot: 'bg-zinc-500',    bg: 'bg-zinc-900/40' },
  CHECKING:       { label: 'Checking…',        color: 'text-sky-400',    dot: 'bg-sky-400',     bg: 'bg-sky-950/40'  },
  ELIGIBLE:       { label: 'Eligible',         color: 'text-emerald-400',dot: 'bg-emerald-400', bg: 'bg-emerald-950/40' },
  NOT_ELIGIBLE:   { label: 'Not Eligible',     color: 'text-zinc-500',   dot: 'bg-zinc-600',    bg: 'bg-zinc-900/20' },
  ERROR:          { label: 'Error',            color: 'text-red-400',    dot: 'bg-red-500',     bg: 'bg-red-950/40'  },
  ACTION_REQUIRED:{ label: 'Action Required',  color: 'text-amber-400',  dot: 'bg-amber-400',   bg: 'bg-amber-950/40' },
};

export function getStatusConfig(status: AccountStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
}

// ── Date formatting ───────────────────────────────────────────────────────────
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24)  return `${diffHr}h ago`;
  if (diffDay < 7)  return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ── Stats computation ─────────────────────────────────────────────────────────
export function computeStats(accounts: GoogleAccount[]): DashboardStats {
  return accounts.reduce<DashboardStats>(
    (acc, a) => {
      acc.total++;
      if (a.status === 'ELIGIBLE')  acc.eligible++;
      if (a.status === 'CHECKING')  acc.checking++;
      if (a.status === 'ERROR' || a.status === 'ACTION_REQUIRED') acc.error++;
      if (a.status === 'PENDING')   acc.pending++;
      return acc;
    },
    { total: 0, eligible: 0, checking: 0, error: 0, pending: 0 }
  );
}

// ── Email masking ─────────────────────────────────────────────────────────────
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}
