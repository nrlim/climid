'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { addAccount } from '@/app/actions/vault';

interface AddAccountModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAccountModal({ onClose, onSuccess }: AddAccountModalProps) {
  const [isPending, startTransition] = useTransition();
  const [inputType, setInputType] = useState<'password' | 'cookies'>('password');
  const [showSecret, setShowSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  
  const handleEmailChange = (val: string) => {
    const oldPrefix = email.split('@')[0];
    setEmail(val);
    if (!label || label === oldPrefix) {
      setLabel(val.split('@')[0]);
    }
  };

  const [password, setPassword] = useState('');
  const [cookies, setCookies] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let parsedCookies: unknown = undefined;
    if (cookies.trim()) {
      try {
        parsedCookies = JSON.parse(cookies);
      } catch {
        setError('Cookies must be valid JSON array.');
        return;
      }
    }

    if (!password.trim() && !cookies.trim()) {
      setError('Please provide either a password or session cookies.');
      return;
    }

    startTransition(async () => {
      const result = await addAccount({
        email,
        label: label || undefined,
        password: password || undefined,
        cookies: parsedCookies as never,
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-panel"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--clr-accent-2)',
                }}
              >
                <ShieldCheck size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Add Account</div>
                <div style={{ fontSize: 11, color: 'var(--clr-subtle)' }}>AES-256 Encrypted Hybrid Vault</div>
              </div>
            </div>
            <button className="btn btn-icon" onClick={onClose} id="close-add-account-modal">
              <X size={14} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-muted)', display: 'block', marginBottom: 6 }}>
                Google Email *
              </label>
              <input
                id="account-email-input"
                className="input-field"
                type="email"
                placeholder="user@gmail.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Input Type Tabs */}
            <div style={{ padding: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--clr-border-2)', borderRadius: '10px', display: 'flex', gap: '4px', position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setInputType('password'); setCookies(''); }}
                style={{ flex: 1, padding: '8px 0', fontSize: '12px', fontWeight: 600, borderRadius: '6px', color: inputType === 'password' ? 'var(--clr-text)' : 'var(--clr-muted)', background: inputType === 'password' ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setInputType('cookies'); setPassword(''); }}
                style={{ flex: 1, padding: '8px 0', fontSize: '12px', fontWeight: 600, borderRadius: '6px', color: inputType === 'cookies' ? 'var(--clr-text)' : 'var(--clr-muted)', background: inputType === 'cookies' ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                Session Cookies
              </button>
            </div>

            <AnimatePresence mode="wait">
              {inputType === 'password' ? (
                <motion.div
                  key="password-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-muted)', display: 'block', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={14} color="var(--clr-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      id="account-password-input"
                      className="input-field"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: 34, paddingRight: 40, width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--clr-subtle)', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cookies-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-muted)' }}>
                      Session JSON
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '3px 8px', border: 'none', fontSize: 11 }}
                      onClick={() => setShowSecret((v) => !v)}
                    >
                      {showSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <textarea
                    id="account-cookies-input"
                    className="input-field"
                    placeholder='[{"name":"SID","value":"...","domain":".google.com"}]'
                    value={cookies}
                    onChange={(e) => setCookies(e.target.value)}
                    rows={4}
                    style={{
                      resize: 'vertical',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      width: '100%',
                      filter: showSecret || !cookies ? 'none' : 'blur(4px)',
                      transition: 'filter 0.2s',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>



            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                  fontSize: 12,
                }}
              >
                {error}
              </motion.div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <motion.button
                id="submit-add-account-btn"
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={isPending || (!email)}
                whileTap={{ scale: 0.97 }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
                    Encrypting & Storing…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} />
                    Secure & Add Account
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
