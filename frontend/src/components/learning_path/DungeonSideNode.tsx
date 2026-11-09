import React from 'react';
import type { PathNode } from '../../types';
import { getTrailStyle } from './dungeonConstants';

interface DungeonSideNodeProps {
  node: PathNode;
  onOpen: (node: PathNode) => void;
}

export const DungeonSideNode: React.FC<DungeonSideNodeProps> = ({ node, onOpen }) => {
  const style = getTrailStyle(node);
  const isCompleted = node.is_completed;

  return (
    <div
      onClick={() => onOpen(node)}
      title={node.title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        cursor: 'pointer',
        userSelect: 'none',
        width: '84px',
        flexShrink: 0,
      }}
    >
      {/* Icon bubble */}
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: isCompleted ? 'rgba(88,204,2,0.15)' : style.bg,
          border: `2.5px ${isCompleted ? 'solid var(--color-green)' : 'dashed ' + style.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: `0 3px 10px ${isCompleted ? 'rgba(88,204,2,0.25)' : 'rgba(0,0,0,0.12)'}`,
          transition: 'transform 0.15s, box-shadow 0.15s',
          position: 'relative',
        }}
        className="dungeon-side-node-bubble"
      >
        {isCompleted ? '⭐' : style.icon}
        {/* XP badge */}
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          right: '-6px',
          background: style.color,
          color: '#fff',
          fontSize: '0.6rem',
          fontWeight: 900,
          padding: '1px 4px',
          borderRadius: '6px',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}>
          +{node.xp_reward ?? 25}
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        color: isCompleted ? 'var(--color-green)' : style.color,
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '80px',
      }}>
        {style.label}
      </div>

      {/* Title snippet */}
      <div style={{
        fontSize: '0.6rem',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '80px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
      }}>
        {node.title}
      </div>
    </div>
  );
};
