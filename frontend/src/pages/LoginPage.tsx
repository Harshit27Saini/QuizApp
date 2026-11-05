import React, { useState } from 'react';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';

interface LoginPageProps {
  onSuccess: (user: any) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onContinueAsGuest }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onSuccess(res.user);
    } catch (err: any) {
      soundManager.playError();
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--color-bg)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        {/* Brand Hero */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'var(--color-green)',
            borderBottom: '5px solid var(--color-green-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 24px rgba(88, 204, 2, 0.35)'
          }}>
            ⚡
          </div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '1px',
            color: 'var(--color-green)',
            margin: 0
          }}>
            RECALL
          </h1>
          <p style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            marginTop: '0.35rem'
          }}>
            AI-Powered Active Recall & Playtest Learning
          </p>
        </div>

        {/* Auth Card */}
        <div className="card" style={{
          width: '100%',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)'
        }}>
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
                padding: '0.6rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: !isSignUp ? 'var(--color-surface)' : 'transparent',
                color: !isSignUp ? 'var(--color-blue-dark)' : 'var(--color-text-muted)',
                boxShadow: !isSignUp ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(null); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: isSignUp ? 'var(--color-surface)' : 'transparent',
                color: isSignUp ? 'var(--color-blue-dark)' : 'var(--color-text-muted)',
                boxShadow: isSignUp ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Create Account
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
              {isSignUp ? 'Join the Playtest Study Squad' : 'Welcome Back!'}
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {isSignUp
                ? 'Create your account to sync collections, earn XP, and challenge friends.'
                : 'Sign in to access your saved syllabi and active streak flame.'}
            </p>
          </div>

          {/* Error Notice */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isSignUp && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Your Name / Nickname
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harshit, Rahul, or Nandhini"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
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
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-green"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
            >
              {loading
                ? 'Authenticating...'
                : isSignUp
                ? '🚀 Create Account & Start Studying'
                : '🔓 Sign In'}
            </button>
          </form>

          {/* Continue as Guest option */}
          {onContinueAsGuest && (
            <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={onContinueAsGuest}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer'
                }}
              >
                Or Continue as Guest (Trial Mode) →
              </button>
            </div>
          )}
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-mode" style={{ fontSize: '0.7rem' }}>📱 Mobile & Tablet Ready</span>
          <span className="badge badge-xp" style={{ fontSize: '0.7rem' }}>⚡ Active Recall Quizzes</span>
          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>🏆 Friends Leagues</span>
        </div>
      </div>
    </div>
  );
};

