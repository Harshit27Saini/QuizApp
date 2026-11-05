import React, { useState, useEffect } from 'react';
import { SidebarNav } from './SidebarNav';
import { RightWidgetSidebar } from './RightWidgetSidebar';
import { FeedbackModal } from '../common/FeedbackModal';
import { themeService, type ThemeMode } from '../../services/theme';
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [xpBalance, setXpBalance] = useState<number>(xpService.getBalance());
  const [streakDays, setStreakDays] = useState<number>(questService.getState().streakDays);
  const activeCompanion = companionService.getActiveCompanion();

  useEffect(() => {
    const handleThemeChanged = (e: any) => {
      setTheme(e.detail || themeService.getTheme());
    };
    const handleXpChanged = () => {
      setXpBalance(xpService.getBalance());
      setStreakDays(questService.getState().streakDays);
    };

    window.addEventListener('recall:theme-changed', handleThemeChanged);
    window.addEventListener('recall:xp-changed', handleXpChanged);
    window.addEventListener('recall:streak-changed', handleXpChanged);

    return () => {
      window.removeEventListener('recall:theme-changed', handleThemeChanged);
      window.removeEventListener('recall:xp-changed', handleXpChanged);
      window.removeEventListener('recall:streak-changed', handleXpChanged);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('recall_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleToggleTheme = () => {
    const next = themeService.toggleTheme();
    setTheme(next);
  };

  return (
    <div className="app-layout-3col">
      {/* Column 1: Left Navigation Sidebar */}
      <SidebarNav />

      {/* Column 2: Center Main Feed with Top Utility Header */}
      <main className={`main-feed ${isSidebarCollapsed ? 'expanded-view' : ''}`}>
        {/* Top Floating App Bar */}
        <div style={{
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
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)', letterSpacing: '0.5px' }}>
              Study Workspace
            </span>
          </div>

          {/* Right Top Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Stat Pill (Dropdown / Sidebar Toggle) */}
            <button
              onClick={toggleSidebar}
              className="btn-3d btn-3d-white"
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

            {/* Dark Mode Toggle */}
            <button
              onClick={handleToggleTheme}
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Midnight Dark'} Mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

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
              className="btn-3d btn-3d-white"
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

      {/* Column 3: Right Widget & Companion Sidebar (Tucked away when collapsed) */}
      {!isSidebarCollapsed && (
        <RightWidgetSidebar onClose={toggleSidebar} />
      )}

      {/* Playtester Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </div>
  );
};
