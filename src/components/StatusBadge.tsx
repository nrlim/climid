'use client';

import { motion } from 'framer-motion';
import type { AccountStatus } from '@/types';
import { getStatusConfig } from '@/lib/utils';

interface StatusBadgeProps {
  status: AccountStatus;
  size?: 'sm' | 'md';
  animate?: boolean;
}

export function StatusBadge({ status, size = 'md', animate = false }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const isAnimated = animate || status === 'CHECKING';

  return (
    <span
      className="status-badge"
      style={{
        fontSize: size === 'sm' ? 10 : 11,
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
      }}
    >
      <motion.span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
        }}
        className={config.dot}
        animate={
          isAnimated
            ? { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }
            : {}
        }
        transition={
          isAnimated
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      />
      <span className={config.color}>{config.label}</span>
    </span>
  );
}
