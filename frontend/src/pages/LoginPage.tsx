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

  const handleGoogleLogin = async () => {
    const inputEmail = prompt('Enter your Google Account email to continue with Google:', 'harshit27saini@gmail.com');
    if (!inputEmail || !inputEmail.includes('@')) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.loginWithGoogle({
        email: inputEmail.trim().toLowerCase(),
        display_name: inputEmail.split('@')[0]
      });

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
      setError(err.message || 'Google authentication failed.');
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
            Active Recall & Syllabus Mastery Platform
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

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-3d btn-3d-white"
            style={{
              width: '100%',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              fontSize: '0.925rem',
              fontWeight: 800
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-subtle)' }}>OR EMAIL</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

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

