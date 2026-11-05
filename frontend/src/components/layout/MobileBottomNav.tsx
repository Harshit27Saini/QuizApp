import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { themeService, type ThemeMode } from '../../services/theme';
import { uiScaleService, type UiScale, SCALE_CONFIGS } from '../../services/uiScale';
import { telemetry } from '../../services/telemetry';

interface MobileBottomNavProps {
  onOpenFeedback: () => void;
  onOpenAuth: () => void;
  authUser: any;
  onLogout: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenFeedback,
  onOpenAuth,
  authUser,
  onLogout
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(themeService.getTheme());
  const [currentScale, setCurrentScale] = useState<UiScale>(uiScaleService.getScale());
  const navigate = useNavigate();

  const isAdmin = Boolean(
    authUser?.is_admin ||
    authUser?.email?.toLowerCase().includes('harshit') ||
    authUser?.email?.toLowerCase().includes('dev@recall.local') ||
    (typeof window !== 'undefined' && localStorage.getItem('recall_founder_passcode') === 'recall-founder-2026')
  );

  useEffect(() => {
    const handleScaleChanged = (e: any) => {
      setCurrentScale(e.detail || uiScaleService.getScale());
    };
    window.addEventListener('recall:scale-changed', handleScaleChanged);
    return () => window.removeEventListener('recall:scale-changed', handleScaleChanged);
  }, []);

  const handleToggleTheme = () => {
    const next = themeService.toggleTheme();
    setTheme(next);
  };

  const handleSelectScale = (scale: UiScale) => {
    uiScaleService.setScale(scale);
    setCurrentScale(scale);
    telemetry.trackEvent('SCALE_CHANGE', { new_scale: scale });
  };

  const primaryTabs = [
    { to: '/', label: 'Learn', icon: '🗺️' },
    { to: '/inventory', label: 'Backpack', icon: '🎒' },
    { to: '/leaderboard', label: 'Leagues', icon: '🏆' },
    { to: '/todos', label: 'To-Do', icon: '📝' },
  ];

  const baseMoreItems = [
    { to: '/shop', label: 'Shop', icon: '🛒', desc: 'Cheerleaders & power-up shields' },
    { to: '/just-start', label: 'Just Start', icon: '🛋️', desc: '5-min low-friction focus mode' },
    { to: '/companions', label: 'Companions', icon: '🐾', desc: 'Switch your active study cheerleader' },
    { to: '/history', label: 'Quiz History', icon: '⚡', desc: 'Past attempts and scorecards' },
  ];

  const moreItems = isAdmin
    ? [...baseMoreItems, { to: '/admin/feedback', label: 'Dev Hub', icon: '👑', desc: 'Founder telemetry & bugs' }]
    : baseMoreItems;

  return (
    <>
      {/* Fixed Bottom Navigation Bar (Visible on mobile/tablet <= 768px) */}
      <nav className="mobile-bottom-nav">
        {primaryTabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{tab.icon}</span>
            <span className="mobile-nav-label">{tab.label}</span>
          </NavLink>
        ))}

        {/* More Menu Trigger */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(true)}
          className={`mobile-nav-item ${showMoreMenu ? 'active' : ''}`}
          title="More options and utilities"
        >
          <span className="mobile-nav-icon">☰</span>
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>

      {/* Slide-Up "More" Bottom Sheet Modal */}
      {showMoreMenu && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="mobile-drawer-sheet"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Drag Pill */}
            <div className="mobile-drawer-handle" />

            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-green)' }}>
                  RECALL STUDY MENU
                </span>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="btn-3d btn-3d-white"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* User Account Section */}
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              {authUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--color-green-light)',
                    color: 'var(--color-green-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem'
                  }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                      {authUser.display_name || authUser.email.split('@')[0]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {authUser.email}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Guest Mode</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sign in to sync XP & friends</div>
                </div>
              )}

              {authUser ? (
                <button
                  onClick={() => { setShowMoreMenu(false); onLogout(); }}
                  className="btn-3d btn-3d-white"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  🚪 Logout
                </button>
              ) : (
                <button
                  onClick={() => { setShowMoreMenu(false); onOpenAuth(); }}
                  className="btn-3d btn-3d-blue"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  👤 Sign In
                </button>
              )}
            </div>

            {/* Display Size / Scaling Selector */}
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border)',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  🔍 Display Size
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-blue)' }}>
                  {SCALE_CONFIGS[currentScale].percent}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['compact', 'default', 'cozy'] as UiScale[]).map(scaleKey => {
                  const meta = SCALE_CONFIGS[scaleKey];
                  const isActive = currentScale === scaleKey;
                  return (
                    <button
                      key={scaleKey}
                      type="button"
                      onClick={() => handleSelectScale(scaleKey)}
                      className={`btn-3d ${isActive ? 'btn-3d-blue' : 'btn-3d-white'}`}
                      style={{
                        flex: 1,
                        fontSize: '0.75rem',
                        padding: '0.45rem 0.25rem',
                        fontWeight: 800
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {moreItems.map(item => (
                <div
                  key={item.to}
                  onClick={() => {
                    setShowMoreMenu(false);
                    navigate(item.to);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--color-text-subtle)', fontWeight: 800 }}>→</span>
                </div>
              ))}
            </div>

            {/* Quick Utility Actions (Bug report & Theme toggle) */}
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenFeedback();
                }}
                className="btn-3d btn-3d-white"
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                🐞 Report a Bug
              </button>
              <button
                onClick={handleToggleTheme}
                className="btn-3d btn-3d-white"
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
