'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  Globe,
  Activity,
  Settings,
  ChevronRight,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Overview',    icon: LayoutDashboard },
  { href: '/dashboard/inventory', label: 'Inventory',   icon: Globe },
  { href: '/dashboard/vault',     label: 'Vault',       icon: ShieldCheck },
  { href: '/dashboard/logs',      label: 'Live Logs',   icon: Activity },
  { href: '/dashboard/settings',  label: 'Settings',    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="glass"
      style={{
        gridRow: '1 / 3',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        borderRight: '1px solid var(--clr-border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--clr-border)',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}
        >
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
            C-LIMID
          </div>
          <div style={{ fontSize: 10, color: 'var(--clr-subtle)', letterSpacing: '0.06em' }}>
            SECURE VAULT
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <div style={{ marginBottom: 6, padding: '0 4px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--clr-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Navigation
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <motion.div
                key={href}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={15} />
                  <span>{label}</span>
                  {isActive && (
                    <ChevronRight
                      size={12}
                      style={{ marginLeft: 'auto', color: 'var(--clr-accent-2)' }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--clr-border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '12px',
            borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-accent-2)', marginBottom: 2 }}>
            AES-256-GCM Active
          </div>
          <div style={{ fontSize: 10, color: 'var(--clr-subtle)' }}>
            Zero-knowledge encryption
          </div>
        </div>
      </div>
    </aside>
  );
}
