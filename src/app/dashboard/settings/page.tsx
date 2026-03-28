import React from 'react';
import { Settings, Sliders, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: '8px' }}>
          Platform Settings
        </h1>
        <p style={{ color: 'var(--clr-muted)', fontSize: '14px' }}>
          Customize your dashboard preferences and background task intervals.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Playwright Settings */}
        <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--clr-border-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Sliders size={18} color="var(--clr-accent-2)" />
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--clr-text)' }}>Playwright Engine</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--clr-subtle)', marginBottom: '16px' }}>
            The default testing environment is configured for `chromium-mobile` (Pixel 5 simulation). High-concurrency changes should be made directly in `playwright.config.js`.
          </p>
          <button className="btn btn-ghost" disabled>Simulate Timeout Check</button>
        </div>

        {/* Telegram Notifications */}
        <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--clr-border-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Bell size={18} color="var(--clr-accent-2)" />
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--clr-text)' }}>Telegram Notifications</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--clr-subtle)' }}>
            To enable real-time telegram alerts mapped to ELIGIBLE accounts, configure `TELEGRAM_BOT_TOKEN` in the `.env` file first.
          </p>
        </div>
      </div>
    </div>
  );
}
