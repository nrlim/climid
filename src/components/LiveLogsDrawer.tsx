'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Terminal } from 'lucide-react';
import type { LiveLog } from '@/types';
import { formatDateTime } from '@/lib/utils';

interface LiveLogsDrawerProps {
  onClose: () => void;
}

const LOG_COLORS: Record<LiveLog['level'], string> = {
  info:    'var(--clr-muted)',
  warn:    '#f59e0b',
  error:   '#f87171',
  success: '#34d399',
};

const LOG_PREFIXES: Record<LiveLog['level'], string> = {
  info:    'INFO',
  warn:    'WARN',
  error:   'ERR ',
  success: ' OK ',
};

export function LiveLogsDrawer({ onClose }: LiveLogsDrawerProps) {
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Polling — fetch logs every 2 seconds
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs?limit=60');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs ?? []);
        }
      } catch {
        // silently fail
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Always scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        maxWidth: '90vw',
        background: 'var(--clr-surface)',
        borderLeft: '1px solid var(--clr-border)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--clr-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={15} color="var(--clr-accent-2)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Live Worker Logs</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 99,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'block' }} />
            <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>LIVE</span>
          </div>
        </div>
        <button id="close-logs-drawer" className="btn btn-icon" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Log area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          background: '#05080e',
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: 'var(--clr-subtle)',
            }}
          >
            <Terminal size={24} />
            <div style={{ fontSize: 13 }}>Waiting for worker activity…</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                className="log-line"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: `${LOG_COLORS[log.level]}18`,
                    color: LOG_COLORS[log.level],
                    flexShrink: 0,
                  }}
                >
                  {LOG_PREFIXES[log.level]}
                </span>
                <span style={{ color: LOG_COLORS[log.level], flex: 1, wordBreak: 'break-word' }}>
                  {log.accountEmail && (
                    <span style={{ color: '#818cf8', marginRight: 6 }}>
                      [{log.accountEmail}]
                    </span>
                  )}
                  {log.message}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--clr-border)',
          fontSize: 11,
          color: 'var(--clr-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#10b981' }}>●</span>
        Polling every 2s · {logs.length} events
      </div>
    </motion.div>
  );
}
