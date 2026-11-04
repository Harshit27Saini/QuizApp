import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export const Navbar: React.FC = () => {
  const [xp, setXp] = useState<number>(120);

  useEffect(() => {
    api.getMyProfile()
      .then(profile => setXp(profile.xp))
      .catch(() => setXp(120));
  }, []);

  return (
    <header style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0.875rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--color-text-main)' }}>
          <span style={{
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            width: '28px',
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1rem'
          }}>R</span>
          <span>Recall</span>
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <Link to="/" style={{ color: 'var(--color-text-muted)' }}>Collections</Link>
          <Link to="/history" style={{ color: 'var(--color-text-muted)' }}>History</Link>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="badge badge-xp" title="Experience Points earned through active recall">
          ⚡ {xp} XP
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.875rem'
        }}>
          U
        </div>
      </div>
    </header>
  );
};
