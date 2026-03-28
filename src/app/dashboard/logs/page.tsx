'use client';
import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Simulating Playwright worker logs stream
    const defaultLogs = [
      '[System] Initializing BullMQ validation_queue observer...',
      '[System] Playwright engine ready. Redis connection established.',
      '[Worker] Waiting for new jobs in the queue...'
    ];
    setLogs(defaultLogs);

    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setLogs(prev => [...prev, `[Queue] Job heartbeat acknowledged at ${new Date().toISOString()}`].slice(-20));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', color: '#22c55e' }}>
          <Activity size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: '4px' }}>
            Live Logs
          </h1>
          <p style={{ color: 'var(--clr-muted)', fontSize: '13px' }}>
            Real-time validation worker output and Playwright execution traces.
          </p>
        </div>
      </div>

      <div className="glass" style={{ flex: 1, padding: '24px', borderRadius: '12px', border: '1px solid var(--clr-border-2)', background: '#0a0a0a', overflowY: 'auto', fontFamily: 'monospace' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ color: log.includes('Job heartbeat') ? '#8b5cf6' : '#a1a1aa', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            $ {log}
          </div>
        ))}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
           <span style={{ color: '#22c55e', fontSize: '13px' }}>Listening...</span>
        </div>
      </div>
    </div>
  );
}
