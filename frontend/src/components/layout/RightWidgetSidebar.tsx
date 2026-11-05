import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companionService } from '../../services/companions';
import { questService, type DailyQuestState, type QuestItem } from '../../services/quests';
import { xpService } from '../../services/xp';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';
import { QuestDetailModal } from '../common/QuestDetailModal';

interface RightWidgetSidebarProps {
  onClose?: () => void;
}

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({ onClose }) => {
  const companion = companionService.getActiveCompanion();
  const [cheer, setCheer] = useState<string>('');
  const [questState, setQuestState] = useState<DailyQuestState>(questService.getState());
  const [xpBalance, setXpBalance] = useState<number>(xpService.getBalance());
  const [selectedQuest, setSelectedQuest] = useState<QuestItem | null>(null);
  const [doubleXpSeconds, setDoubleXpSeconds] = useState<number>(xpService.isDoubleXpActive().secondsRemaining);

  useEffect(() => {
    setCheer(companionService.getRandomCheer());
    setQuestState(questService.getState());
    setXpBalance(xpService.getBalance());

    const handleXpChanged = () => {
      setXpBalance(xpService.getBalance());
      setQuestState(questService.getState());
      setDoubleXpSeconds(xpService.isDoubleXpActive().secondsRemaining);
    };

    const handleQuestsChanged = (e: any) => {
      setQuestState(e.detail || questService.getState());
    };

    window.addEventListener('recall:xp-changed', handleXpChanged);
    window.addEventListener('recall:quests-changed', handleQuestsChanged);
    window.addEventListener('recall:streak-changed', handleQuestsChanged);

    // Double XP live countdown ticker
    const timer = setInterval(() => {
      const info = xpService.isDoubleXpActive();
      setDoubleXpSeconds(info.secondsRemaining);
    }, 1000);

    return () => {
      window.removeEventListener('recall:xp-changed', handleXpChanged);
      window.removeEventListener('recall:quests-changed', handleQuestsChanged);
      window.removeEventListener('recall:streak-changed', handleQuestsChanged);
      clearInterval(timer);
    };
  }, [companion.id]);

  const handleClaimQuest = () => {
    const res = questService.claimReward();
    if (res) {
      soundManager.playVictory();
      triggerConfetti();
      setQuestState(questService.getState());
    }
  };

  const allQuestsCompleted = questState.quests.every(q => q.completed);
  const freezeCount = xpService.getInventory().streak_freeze || 0;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <aside className="sidebar-right">
      {/* 0. Top Controls (Close drawer button if in mobile or collapsed mode) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)', letterSpacing: '0.5px' }}>
          Study Center
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            title="Collapse sidebar"
          >
            ✕ Collapse
          </button>
        )}
      </div>

      {/* 0.1 Active Double XP Banner (if activated) */}
      {doubleXpSeconds > 0 && (
        <div className="card" style={{
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, rgba(206, 130, 255, 0.2), rgba(28, 176, 246, 0.15))',
          border: '2px solid var(--color-purple)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'gentlePulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🧪</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-purple-dark)' }}>
                2X XP Active!
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                Double XP on all quizzes & units
              </div>
            </div>
          </div>
          <span className="badge" style={{ background: 'var(--color-purple)', color: '#ffffff', fontWeight: 900, fontSize: '0.75rem' }}>
            ⏱️ {formatSeconds(doubleXpSeconds)}
          </span>
        </div>
      )}

      {/* 1. XP Wallet Balance & Shop Link */}
      <div className="card" style={{
        padding: '0.875rem 1.125rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(255, 200, 0, 0.15), rgba(255, 150, 0, 0.08))',
        border: '2px solid var(--color-gold)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-gold-dark)', lineHeight: 1.1 }}>
              {xpBalance} XP
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Spendable Balance
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Link to="/inventory" className="btn-3d btn-3d-white" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }} title="Open Backpack">
            🎒
          </Link>
          <Link to="/shop" className="btn-3d btn-3d-gold" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
            🛒 Shop
          </Link>
        </div>
      </div>

      {/* 2. Real-Date Daily Streak & Freeze Protection Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔥</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: questState.streakDays > 0 ? 'var(--color-orange-dark)' : 'var(--color-text-muted)' }}>
                {questState.streakDays} Day Streak{questState.streakDays > 0 ? '!' : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {questState.streakDays === 0 ? 'Complete 1 lesson to start your streak flame 🔥!' : 'Study today to extend it!'}
              </div>
            </div>
          </div>

          <Link
            to="/inventory"
            title="View streak freeze in Backpack"
            style={{ textDecoration: 'none' }}
          >
            {freezeCount > 0 ? (
              <span className="badge" style={{ background: 'rgba(28, 176, 246, 0.15)', color: 'var(--color-blue)', border: '1.5px solid var(--color-blue)', fontSize: '0.7rem', fontWeight: 800 }}>
                🛡️ {freezeCount} Freeze Armed
              </span>
            ) : (
              <span className="badge" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.7rem' }}>
                🛡️ + Shield in Shop
              </span>
            )}
          </Link>
        </div>

        {/* Dynamic 7-Day Rolling Calendar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
          {questState.weekDays.map((d, i) => {
            const isOrange = d.completed;
            const isBlue = d.isFrozen;
            const isRing = d.isToday;

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isBlue
                    ? 'var(--color-blue)'
                    : isOrange
                    ? 'var(--color-orange)'
                    : 'var(--color-surface-hover)',
                  color: (isOrange || isBlue) ? '#ffffff' : 'var(--color-text-subtle)',
                  border: isRing ? '2.5px solid var(--color-blue)' : '2px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  boxShadow: isRing ? '0 0 8px rgba(28, 176, 246, 0.4)' : 'none'
                }}>
                  {isBlue ? '🛡️' : isOrange ? '✓' : ''}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: isRing ? 900 : 700, color: isRing ? 'var(--color-blue)' : 'var(--color-text-muted)' }}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Daily Quests Interactive Duolingo Card */}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {questState.quests.map(q => {
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));
            return (
              <div
                key={q.id}
                onClick={() => setSelectedQuest(q)}
                title="Click to view quest instructions & shortcut"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)',
                  border: '1.5px solid var(--color-border)',
                  transition: 'border-color var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{q.icon}</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-text-main)' }}>{q.title}</span>
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

      {/* 4. Active Companion Cheerleader Widget */}
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

      {/* Quest Detail Modal */}
      <QuestDetailModal
        quest={selectedQuest}
        onClose={() => setSelectedQuest(null)}
      />
    </aside>
  );
};
