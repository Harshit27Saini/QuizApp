import React, { useState, useEffect } from 'react';
import { SidebarNav } from './SidebarNav';
import { RightWidgetSidebar } from './RightWidgetSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { FeedbackModal } from '../common/FeedbackModal';
import { AuthModal } from '../auth/AuthModal';
import { LoginPage } from '../../pages/LoginPage';
import { themeService, type ThemeMode } from '../../services/theme';
import { uiScaleService, type UiScale, SCALE_CONFIGS } from '../../services/uiScale';
import { xpService } from '../../services/xp';
import { questService } from '../../services/quests';
import { companionService } from '../../services/companions';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(themeService.getTheme());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('recall_sidebar_collapsed') === 'true';
  });
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasToken, setHasToken] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return Boolean(localStorage.getItem('recall_auth_token'));
  });
  const [guestBypass, setGuestBypass] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('recall_user_profile') || 'null');
    } catch {
      return null;
    }
  });
  const [xpBalance, setXpBalance] = useState<number>(xpService.getBalance());
  const [streakDays, setStreakDays] = useState<number>(questService.getState().streakDays);
  const [currentScale, setCurrentScale] = useState<UiScale>(uiScaleService.getScale());
  const activeCompanion = companionService.getActiveCompanion();

  useEffect(() => {
    const handleThemeChanged = (e: any) => {
      setTheme(e.detail || themeService.getTheme());
    };
    const handleScaleChanged = (e: any) => {
      setCurrentScale(e.detail || uiScaleService.getScale());
    };
    const handleXpChanged = () => {
      setXpBalance(xpService.getBalance());
      setStreakDays(questService.getState().streakDays);
    };
    const handleAuthChanged = (e: any) => {
      setAuthUser(e.detail || null);
      setHasToken(Boolean(localStorage.getItem('recall_auth_token')));
    };

    window.addEventListener('recall:theme-changed', handleThemeChanged);
    window.addEventListener('recall:scale-changed', handleScaleChanged);
    window.addEventListener('recall:xp-changed', handleXpChanged);
    window.addEventListener('recall:streak-changed', handleXpChanged);
    window.addEventListener('recall:auth-changed', handleAuthChanged);

    return () => {
      window.removeEventListener('recall:theme-changed', handleThemeChanged);
      window.removeEventListener('recall:scale-changed', handleScaleChanged);
      window.removeEventListener('recall:xp-changed', handleXpChanged);
      window.removeEventListener('recall:streak-changed', handleXpChanged);
      window.removeEventListener('recall:auth-changed', handleAuthChanged);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm('Log out of this playtest account?')) {
      localStorage.removeItem('recall_auth_token');
      localStorage.removeItem('recall_user_profile');
      setAuthUser(null);
      setHasToken(false);
      setGuestBypass(false);
      window.dispatchEvent(new CustomEvent('recall:auth-changed', { detail: null }));
    }
  };

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1180) {
      setShowMobileDrawer(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('recall_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  const handleToggleTheme = () => {
    const next = themeService.toggleTheme();
    setTheme(next);
  };

  // Immediate Login Gate: Prompt unauthenticated visitors as soon as they open the site
  if (!hasToken && !guestBypass) {
    return (
      <LoginPage
        onSuccess={(user) => {
          setAuthUser(user);
          setHasToken(true);
        }}
        onContinueAsGuest={() => setGuestBypass(true)}
      />
    );
  }

  return (
    <div className="app-layout-3col">
      {/* Column 1: Left Navigation Sidebar */}
      <SidebarNav />

      {/* Column 2: Center Main Feed with Top Utility Header */}
      <main className={`main-feed ${isSidebarCollapsed ? 'expanded-view' : ''}`}>
        {/* Top Floating App Bar */}
        <div className="top-app-bar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '1.5px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Quick Breadcrumbs / Title Space */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="study-workspace-label" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)', letterSpacing: '0.5px' }}>
              Study Workspace
            </span>
          </div>

          {/* Right Top Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Stat Pill (Dropdown / Sidebar Toggle) */}
            <button
              onClick={toggleSidebar}
              className="btn-3d btn-3d-white stat-pill"
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="Click to toggle Study Center right sidebar"
            >
              <span>⚡ {xpBalance}</span>
              <span>•</span>
              <span>🔥 {streakDays}d</span>
              <span>•</span>
              <span>🐾 {activeCompanion.name.split(' ')[0]}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                {isSidebarCollapsed ? '▾' : '▴'}
              </span>
            </button>

            {/* UI Scale / Display Size Toggle Button */}
            <button
              onClick={() => {
                const next = uiScaleService.cycleScale();
                setCurrentScale(next);
              }}
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title={`Display Size: ${SCALE_CONFIGS[currentScale].label} (${SCALE_CONFIGS[currentScale].percent}) - Click to toggle size`}
            >
              <span style={{ fontSize: '0.9rem' }}>Aa</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 900 }}>{SCALE_CONFIGS[currentScale].percent}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={handleToggleTheme}
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Midnight Dark'} Mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* User Account / Sign In Pill */}
            {authUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} title={`Logged in as ${authUser.email}`}>
                  👤 {authUser.display_name || authUser.email.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-3d btn-3d-white"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  title="Log Out of Playtest Account"
                >
                  🚪
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-3d btn-3d-blue"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                title="Sign in or register to challenge friends"
              >
                👤 Sign In / Join
              </button>
            )}

            {/* Playtest Bug / Feedback Button */}
            <button
              onClick={() => setShowFeedback(true)}
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              title="Report Bug / Give Feedback"
            >
              🐞 Bug
            </button>

            {/* Toggle Sidebar Chevron Button */}
            <button
              onClick={toggleSidebar}
              className="btn-3d btn-3d-white chevron-toggle"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
              title={isSidebarCollapsed ? 'Expand Study Center' : 'Collapse Study Center'}
            >
              {isSidebarCollapsed ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Page Content */}
        {children}
      </main>

      {/* Column 3: Right Widget & Companion Sidebar (Desktop >= 1180px) */}
      {!isSidebarCollapsed && (
        <RightWidgetSidebar onClose={toggleSidebar} />
      )}

      {/* Mobile Slide-Over Study Center Drawer (< 1180px) */}
      {showMobileDrawer && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setShowMobileDrawer(false)}
        >
          <div
            className="mobile-study-drawer"
            onClick={e => e.stopPropagation()}
          >
            <RightWidgetSidebar onClose={() => setShowMobileDrawer(false)} />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Fixed for phones & small tablets <= 768px) */}
      <MobileBottomNav
        onOpenFeedback={() => setShowFeedback(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        authUser={authUser}
        onLogout={handleLogout}
      />

      {/* Playtester Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />

      {/* Playtester Auth Sign-In / Join Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};
