'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { triggerAllAudits } from '@/app/actions/queue';

interface RunAllButtonProps {
  accountCount: number;
  disabled?: boolean;
}

export function RunAllButton({ accountCount, disabled }: RunAllButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<'idle' | 'queued' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleClick = () => {
    if (isPending || state === 'queued') return;

    startTransition(async () => {
      const result = await triggerAllAudits();

      if (result.success) {
        setState('queued');
        setMessage(`${result.data.queued} jobs dispatched`);
        // Reset to idle after 4 seconds
        setTimeout(() => setState('idle'), 4000);
      } else {
        setState('error');
        setMessage(result.error);
        setTimeout(() => setState('idle'), 3000);
      }
    });
  };

  const isLoading = isPending;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <motion.button
        id="run-all-audits-btn"
        className="btn btn-primary"
        onClick={handleClick}
        disabled={disabled || isPending || accountCount === 0}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        style={{ position: 'relative', overflow: 'hidden', minWidth: 180 }}
      >
        {/* Shimmer overlay */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
          }}
          animate={!isLoading ? { x: ['-100%', '200%'] } : {}}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
        />

        {isLoading ? (
          <>
            <Loader2 size={14} className="spinner" style={{ animation: 'spin 0.7s linear infinite' }} />
            Dispatching…
          </>
        ) : state === 'queued' ? (
          <>
            <CheckCircle2 size={14} />
            Jobs Queued!
          </>
        ) : (
          <>
            <Play size={14} fill="currentColor" />
            Run All Audits
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {message && (state === 'queued' || state === 'error') && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: 12,
              color: state === 'queued' ? 'var(--clr-success)' : 'var(--clr-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {state === 'queued' ? <Zap size={12} /> : null}
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
