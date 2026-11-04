import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companionService } from '../../services/companions';

export const RightWidgetSidebar: React.FC = () => {
  const companion = companionService.getActiveCompanion();
  const [cheer, setCheer] = useState<string>('');

  useEffect(() => {
    setCheer(companionService.getRandomCheer());
  }, [companion.id]);

  const dailyXpTarget = 50;
  const currentXp = 35; // Demo baseline XP
  const progressRatio = Math.min(1, currentXp / dailyXpTarget);
  const strokeDashoffset = 2 * Math.PI * 34 * (1 - progressRatio);

  const days = [
    { label: 'M', active: true },
    { label: 'T', active: true },
    { label: 'W', active: true },
    { label: 'T', active: true },
    { label: 'F', active: true },
    { label: 'S', active: false },
    { label: 'S', active: false },
  ];

  return (
    <aside className="sidebar-right">
      {/* 1. Daily Streak Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔥</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-orange-dark)' }}>
                5 Day Streak!
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Practice today to keep it lit!
              </div>
            </div>
          </div>
        </div>

        {/* Weekday Dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
          {days.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: d.active ? 'var(--color-orange)' : 'var(--color-border)',
                color: d.active ? '#ffffff' : 'var(--color-text-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {d.active ? '✓' : ''}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Daily Goal Progress Ring */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '76px', height: '76px' }}>
          <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="38"
              cy="38"
              r="34"
              stroke="var(--color-border)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="38"
              cy="38"
              r="34"
              stroke="var(--color-gold)"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            ⚡
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold-dark)', textTransform: 'uppercase' }}>
            Daily Quest
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800 }}>
            {currentXp} / {dailyXpTarget} XP
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            15 XP to daily chest reward!
          </div>
        </div>
      </div>

      {/* 3. Active Companion Cheerleader Widget */}
      <div className="card" style={{ padding: '1.25rem', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge" style={{ background: companion.badgeColor + '20', color: companion.badgeColor, border: `1.5px solid ${companion.badgeColor}` }}>
            {companion.badgeText}
          </span>
          <Link to="/companions" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-blue)' }}>
            Switch ⇄
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
          <div style={{
            fontSize: '2.5rem',
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-hover)',
            border: '2px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            {companion.avatarImageUrl ? (
              <img
                src={companion.avatarImageUrl}
                alt={companion.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              companion.avatarIcon
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 900 }}>{companion.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              {companion.subtitle}
            </div>

            {/* Speech Bubble */}
            <div style={{
              position: 'relative',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border)',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              fontWeight: 700,
              lineHeight: 1.4,
              color: 'var(--color-text-main)'
            }}>
              "{cheer}"
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

