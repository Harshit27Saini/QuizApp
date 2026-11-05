import React, { useState } from 'react';
import { api } from '../../services/api';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res: { token: string; user: any };
      if (isSignUp) {
        res = await api.signup({
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim() || undefined
        });
      } else {
        res = await api.login({
          email: email.trim().toLowerCase(),
          password
        });
      }

      if (res.token) {
        localStorage.setItem('recall_auth_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('recall_user_profile', JSON.stringify(res.user));
      }

      soundManager.playVictory();
      triggerConfetti();
      window.dispatchEvent(new CustomEvent('recall:auth-changed', { detail: res.user }));

      if (onSuccess) {
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      soundManager.playError();
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="card" style={{
        maxWidth: '440px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '1.75rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.75rem' }}>⚡</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-green)' }}>
                RECALL
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>
              {isSignUp ? 'Create Playtest Account' : 'Welcome Back!'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
              {isSignUp
                ? 'Join to sync your XP, streak flame, and challenge friends!'
                : 'Sign in to access your saved study decks and leagues.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--color-surface-hover)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: !isSignUp ? 'var(--color-surface)' : 'transparent',
              color: !isSignUp ? 'var(--color-blue-dark)' : 'var(--color-text-muted)',
              boxShadow: !isSignUp ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: isSignUp ? 'var(--color-surface)' : 'transparent',
              color: isSignUp ? 'var(--color-blue-dark)' : 'var(--color-text-muted)',
              boxShadow: isSignUp ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(255, 75, 75, 0.12)',
            borderLeft: '4px solid var(--color-red)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            color: 'var(--color-red)',
            fontWeight: 700
          }}>
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Your Name / Nickname
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul, Nandhini, or Alex"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="playtester@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-green"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              {loading
                ? 'Processing...'
                : isSignUp
                ? '🚀 Create Account & Start Studying'
                : '🔓 Sign In'}
            </button>
            <button
              type="button"
              className="btn-3d btn-3d-white"
              onClick={onClose}
              disabled={loading}
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

