import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuestItem } from '../../services/quests';

interface QuestDetailModalProps {
  quest: QuestItem | null;
  onClose: () => void;
}

export const QuestDetailModal: React.FC<QuestDetailModalProps> = ({ quest, onClose }) => {
  const navigate = useNavigate();
  if (!quest) return null;

  const pct = Math.min(100, Math.round((quest.current / quest.target) * 100));

  const handleJump = () => {
    onClose();
    if (quest.jumpRoute) {
      navigate(quest.jumpRoute);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(3px)'
    }}>
      <div className="card" style={{
        maxWidth: '440px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '2rem' }}>{quest.icon}</span>
            <div>
              <span className="badge" style={{ background: 'rgba(255, 200, 0, 0.15)', color: 'var(--color-gold-dark)', border: '1px solid var(--color-gold)', fontSize: '0.7rem' }}>
                DAILY QUEST
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0.2rem 0 0 0' }}>
                {quest.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Detailed Explanation */}
        <div style={{
          background: 'var(--color-bg)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          fontSize: '0.925rem',
          color: 'var(--color-text-main)',
          lineHeight: 1.5
        }}>
          {quest.description}
        </div>

        {/* Progress Bar & Counter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Progress Today</span>
            <span style={{ color: quest.completed ? 'var(--color-green)' : 'var(--color-text-main)' }}>
              {quest.completed ? '✓ Completed!' : `${quest.current} / ${quest.target}`}
            </span>
          </div>

          <div style={{ height: '12px', background: 'var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`,
              height: '100%',
              background: quest.completed ? 'var(--color-green)' : 'var(--color-gold)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Reward Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(88, 204, 2, 0.1)',
          border: '1.5px solid var(--color-green)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-green-dark)' }}>
              Reward on Completion:
            </span>
          </div>
          <span className="badge badge-xp" style={{ fontSize: '0.85rem' }}>
            +{quest.xpReward} XP
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            className="btn-3d btn-3d-white"
            onClick={onClose}
            style={{ fontSize: '0.85rem', padding: '0.625rem 1rem' }}
          >
            Close
          </button>
          <button
            className="btn-3d btn-3d-green"
            onClick={handleJump}
            style={{ fontSize: '0.85rem', padding: '0.625rem 1.25rem' }}
          >
            {quest.jumpLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

