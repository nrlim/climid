// C-LIMID | Shared TypeScript Types
// Central type registry for the Next.js dashboard

export type AccountStatus =
  | 'PENDING'
  | 'CHECKING'
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'ERROR'
  | 'ACTION_REQUIRED';

export interface GoogleAccount {
  id: string;
  email: string;
  label: string | null;
  status: AccountStatus;
  lastAuditAt: string | null; // ISO string
  promoLink: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  accountId: string;
  accountEmail: string;
  status: AccountStatus;
  promoLink: string | null;
  error: string | null;
  durationMs: number | null;
  jobId: string | null;
  createdAt: string; // ISO string
}

export interface SecureVault {
  id: string;
  accountEmail: string;
  createdAt: string;
}

// ── Queue / BullMQ Types ──────────────────────────────────────────────────────

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface JobStatus {
  jobId: string;
  name: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: number;
  attemptsMade: number;
  failedReason: string | null;
  returnValue: unknown;
  timestamps: {
    createdAt: string | null;
    processedOn: string | null;
    finishedOn: string | null;
  };
}

// ── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Encryption ────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  encryptedBlob: string;
  iv: string;
  authTag: string;
}

export interface AccountCredentials {
  password?: string;
  cookies?: Cookie[];
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// ── Dashboard UI ──────────────────────────────────────────────────────────────

export interface LiveLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  accountEmail?: string;
  jobId?: string;
}

export interface DashboardStats {
  total: number;
  eligible: number;
  checking: number;
  error: number;
  pending: number;
}
