import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { companionService } from '../../services/companions';

export const SidebarNav: React.FC = () => {
  const activeCompanion = companionService.getActiveCompanion();

  const navItems = [
    { to: '/', label: 'Learn', icon: '🗺️' },
    { to: '/just-start', label: 'Just Start', icon: '🛋️', badge: '5 MIN' },
    { to: '/history', label: 'History', icon: '⚡' },
    { to: '/companions', label: 'Companions', icon: '🐾', badge: 'VIP' },
  ];

  return (
    <aside className="sidebar-left">
      <div>
        {/* Brand Header */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--color-green)',
            borderBottom: '4px solid var(--color-green-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            ⚡
          </div>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--color-green)' }}>
              RECALL
            </span>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)', letterSpacing: '0.5px' }}>
              Production Learning
            </div>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${isActive ? 'var(--color-blue)' : 'transparent'}`,
                background: isActive ? 'var(--color-blue-light)' : 'transparent',
                color: isActive ? 'var(--color-blue-dark)' : 'var(--color-text-main)',
                fontWeight: 800,
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                transition: 'all var(--transition-fast)'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="badge badge-mode" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Active Companion Preview */}
      <Link
        to="/companions"
        style={{
          padding: '0.875rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-hover)',
          border: '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          transition: 'all var(--transition-fast)'
        }}
        title="Click to switch study companion"
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          border: '1.5px solid var(--color-border)',
          fontSize: '1.5rem',
          flexShrink: 0
        }}>
          {companionService.getAvatarUrl(activeCompanion) ? (
            <img
              src={companionService.getAvatarUrl(activeCompanion)}
              alt={activeCompanion.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            activeCompanion.avatarIcon
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-subtle)', textTransform: 'uppercase' }}>
            Active Buddy
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeCompanion.name}
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>⇄</span>
      </Link>
    </aside>
  );
};

