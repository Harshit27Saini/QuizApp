import type { PathNode } from '../../types';

export interface TrailStyle {
  color: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
}

export const TRAIL_STYLES: Record<string, TrailStyle> = {
  main:         { color: 'var(--color-green)',  bg: 'rgba(88,204,2,0.10)',    border: 'var(--color-green)',  icon: '🌲', label: 'Main Quest' },
  deep_dive:    { color: 'var(--color-blue)',   bg: 'rgba(28,176,246,0.12)',  border: 'var(--color-blue)',   icon: '🔬', label: 'Deep Dive' },
  trap_vault:   { color: '#f5a623',             bg: 'rgba(245,166,35,0.12)', border: '#f5a623',             icon: '⚡', label: 'Exam Trap' },
  secret_vault: { color: 'var(--color-purple)', bg: 'rgba(130,80,255,0.12)', border: 'var(--color-purple)', icon: '💎', label: 'Secret Vault' },
  gauntlet:     { color: '#e8b400',             bg: 'rgba(232,180,0,0.15)',  border: '#e8b400',             icon: '👑', label: 'Gauntlet' },
  boss:         { color: 'var(--color-red)',    bg: 'rgba(255,75,75,0.12)',  border: 'var(--color-red)',    icon: '🌋', label: 'Apex Boss' },
};

export function getTrailStyle(node: PathNode): TrailStyle {
  const t = node.trail_type ?? 'main';
  return TRAIL_STYLES[t] ?? TRAIL_STYLES['main'];
}
