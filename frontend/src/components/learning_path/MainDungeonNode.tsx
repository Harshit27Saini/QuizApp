import React from 'react';
import type { PathNode } from '../../types';
import { companionService } from '../../services/companions';

interface MainDungeonNodeProps {
  node: PathNode;
  onOpen: (node: PathNode) => void;
  companion: ReturnType<typeof companionService.getActiveCompanion>;
  cheerQuote: string;
  isCurrent: boolean;
  isMobile: boolean;
}

export const MainDungeonNode: React.FC<MainDungeonNodeProps> = ({
  node,
  onOpen,
  companion,
  cheerQuote,
  isCurrent,
  isMobile,
}) => {
  const isCompleted = node.is_completed;
  const isLocked = node.is_locked;

  const nodeTypeIcon = node.node_type === 'checkpoint'
    ? '🏆'
    : node.node_type === 'scenario'
    ? '🎭'
    : node.is_challenge_trail
    ? '👑'
    : '📖';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Floating Companion beside current node */}
      {isCurrent && (
        <div style={{
          position: 'absolute',
          left: isMobile ? '50%' : '-145px',
          top: isMobile ? '-96px' : '-8px',
          transform: isMobile ? 'translateX(-50%)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: isMobile ? '150px' : '130px',
          zIndex: 10
        }}>
          <div style={{
            background: '#ffffff',
            border: '2px solid var(--color-border)',
            borderBottom: '3px solid var(--color-border-strong)',
            padding: '0.375rem 0.625rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800,
            lineHeight: 1.3,
            textAlign: 'center',
            marginBottom: '4px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
          }}>
            "{cheerQuote}"
          </div>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '2px solid var(--color-border)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            fontSize: '2.5rem'
          }}>
            {companionService.getAvatarUrl(companion) ? (
              <img
                src={companionService.getAvatarUrl(companion)}
                alt={companion.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : companion.avatarIcon}
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: companion.badgeColor }}>
            {companion.name}
          </span>
        </div>
      )}

      {/* 3D Stepping Stone Button */}
      <div
        onClick={() => onOpen(node)}
        className={`stepping-stone-3d ${isCompleted ? 'completed' : isCurrent ? 'active' : 'locked'}`}
        style={node.is_challenge_trail ? {
          border: '3px solid var(--color-gold)',
          boxShadow: '0 8px 24px rgba(255, 184, 0, 0.45)',
          transform: 'scale(1.08)'
        } : undefined}
        title={isLocked ? 'Complete previous unit to unlock' : node.title}
      >
        {node.is_challenge_trail ? '👑' : isCompleted ? '⭐' : isCurrent ? nodeTypeIcon : '🔒'}
      </div>

      {/* Title Label */}
      <div style={{
        marginTop: '0.75rem',
        fontWeight: 900,
        fontSize: '0.9rem',
        textAlign: 'center',
        maxWidth: '180px',
        color: isLocked ? 'var(--color-text-subtle)' : node.is_challenge_trail ? 'var(--color-gold)' : 'var(--color-text-main)'
      }}>
        {node.title}
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {node.is_challenge_trail ? (
          <span className="badge badge-xp" style={{ fontSize: '0.7rem' }}>👑 +75 XP</span>
        ) : (
          <span className="badge" style={{ fontSize: '0.7rem', background: '#ffffff', border: '1.5px solid var(--color-border)' }}>
            {node.node_type === 'checkpoint' ? 'Checkpoint' : node.node_type === 'scenario' ? 'Scenario' : 'Lesson'}
          </span>
        )}
        {isCurrent && <span className="badge badge-mode" style={{ fontSize: '0.7rem' }}>START</span>}
        {isCompleted && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>MASTERED ✓</span>}
      </div>
    </div>
  );
};
