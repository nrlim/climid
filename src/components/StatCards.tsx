'use client';

import { motion } from 'framer-motion';
import type { DashboardStats } from '@/types';
import { 
  Users, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  delay?: number;
}

function StatCard({ label, value, icon, accent, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--clr-muted)', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--clr-text)' }}>
            {value}
          </div>
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}18`,
            border: `1px solid ${accent}30`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

interface StatCardsProps {
  stats: DashboardStats;
}

export function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      label: 'Total Accounts',
      value: stats.total,
      icon: <Users size={17} />,
      accent: '#6366f1',
    },
    {
      label: 'Eligible',
      value: stats.eligible,
      icon: <CheckCircle2 size={17} />,
      accent: '#10b981',
    },
    {
      label: 'Checking',
      value: stats.checking,
      icon: <Loader2 size={17} />,
      accent: '#38bdf8',
    },
    {
      label: 'Errors',
      value: stats.error,
      icon: <AlertTriangle size={17} />,
      accent: '#ef4444',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: <Clock size={17} />,
      accent: '#9ca3af',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}
    >
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 0.06} />
      ))}
    </div>
  );
}
