import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companionService } from '../../services/companions';
import { questService, type DailyQuestState } from '../../services/quests';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';

export const RightWidgetSidebar: React.FC = () => {
  const companion = companionService.getActiveCompanion();
  const [cheer, setCheer] = useState<string>('');
  const [questState, setQuestState] = useState<DailyQuestState>(questService.getState());

  useEffect(() => {
    setCheer(companionService.getRandomCheer());
    setQuestState(questService.getState());
  }, [companion.id]);

  const handleClaimQuest = () => {
    const res = questService.claimReward();
    if (res) {
      soundManager.playVictory();
      triggerConfetti();
      setQuestState(questService.getState());
      alert(`🎉 Claimed Daily Chest! +${res.xp} XP & Streak Freeze shield activated!`);
    }
  };

  const allQuestsCompleted = questState.quests.every(q => q.completed);

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
      {/* 1. Daily Streak & Freeze Protection Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔥</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-orange-dark)' }}>
                {questState.streakDays} Day Streak!
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Practice today to keep it lit!
              </div>
            </div>
          </div>

          {questState.hasStreakFreeze && (
            <span className="badge" style={{ background: 'rgba(28, 176, 246, 0.15)', color: 'var(--color-blue)', border: '1px solid var(--color-blue)', fontSize: '0.7rem' }}>
              🛡️ Freeze Active
            </span>
          )}
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

      {/* 2. Daily Quests Duolingo Card */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-gold-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>⚡</span>
            <span>Daily Quests</span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            {questState.quests.filter(q => q.completed).length}/{questState.quests.length} Done
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questState.quests.map(q => {
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));
            return (
              <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{q.icon}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{q.title}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: q.completed ? 'var(--color-green)' : 'var(--color-text-muted)', fontWeight: 800 }}>
                    {q.completed ? '✓ +XP' : `${q.current}/${q.target}`}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: q.completed ? 'var(--color-green)' : 'var(--color-gold)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {allQuestsCompleted && !questState.claimed && (
          <button
            className="btn-3d btn-3d-gold"
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginTop: '0.25rem' }}
            onClick={handleClaimQuest}
          >
            🎁 Claim Daily Chest (+25 XP)
          </button>
        )}

        {questState.claimed && (
          <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-green)', padding: '0.25rem' }}>
            ✓ Daily Chest Claimed!
          </div>
        )}
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
            {companionService.getAvatarUrl(companion) ? (
              <img
                src={companionService.getAvatarUrl(companion)}
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
