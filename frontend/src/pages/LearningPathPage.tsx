import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { companionService } from '../services/companions';
import { xpService } from '../services/xp';
import { PetAssistantChat } from '../components/learning_path/PetAssistantChat';
import { SandboxSetupModal } from '../components/learning_path/SandboxSetupModal';
import { SteppingStoneRunner } from '../components/learning_path/SteppingStoneRunner';
import type { LearningPath, PathNode, LearningPathGenerateOptions } from '../types';

// ---------------------------------------------------------------------------
// Trail styling configuration
// ---------------------------------------------------------------------------
const TRAIL_STYLES: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  main:         { color: 'var(--color-green)',  bg: 'rgba(88,204,2,0.10)',    border: 'var(--color-green)',  icon: '🌲', label: 'Main Quest' },
  deep_dive:    { color: 'var(--color-blue)',   bg: 'rgba(28,176,246,0.12)',  border: 'var(--color-blue)',   icon: '🔬', label: 'Deep Dive' },
  trap_vault:   { color: '#f5a623',             bg: 'rgba(245,166,35,0.12)', border: '#f5a623',             icon: '⚡', label: 'Exam Trap' },
  secret_vault: { color: 'var(--color-purple)', bg: 'rgba(130,80,255,0.12)', border: 'var(--color-purple)', icon: '💎', label: 'Secret Vault' },
  gauntlet:     { color: '#e8b400',             bg: 'rgba(232,180,0,0.15)',  border: '#e8b400',             icon: '👑', label: 'Gauntlet' },
  boss:         { color: 'var(--color-red)',    bg: 'rgba(255,75,75,0.12)',  border: 'var(--color-red)',    icon: '🌋', label: 'Apex Boss' },
};

function getTrailStyle(node: PathNode) {
  const t = node.trail_type ?? 'main';
  return TRAIL_STYLES[t] ?? TRAIL_STYLES['main'];
}

// ---------------------------------------------------------------------------
// DungeonSideNode — compact card for side trails
// ---------------------------------------------------------------------------
interface SideNodeProps {
  node: PathNode;
  onOpen: (node: PathNode) => void;
}

const DungeonSideNode: React.FC<SideNodeProps> = ({ node, onOpen }) => {
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

// ---------------------------------------------------------------------------
// MainDungeonNode — large 3D stepping stone for main path
// ---------------------------------------------------------------------------
interface MainNodeProps {
  node: PathNode;
  onOpen: (node: PathNode) => void;
  companion: ReturnType<typeof companionService.getActiveCompanion>;
  cheerQuote: string;
  isCurrent: boolean;
  isMobile: boolean;
}

const MainDungeonNode: React.FC<MainNodeProps> = ({ node, onOpen, companion, cheerQuote, isCurrent, isMobile }) => {
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

// ===========================================================================
// Main Page Component
// ===========================================================================
export const LearningPathPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 640);

  const activeCompanion = companionService.getActiveCompanion();
  const [cheerQuote, setCheerQuote] = useState<string>('');

  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [lessonDepth, setLessonDepth] = useState<'sprint' | 'standard' | 'deep_dive'>('standard');
  const [showNandhiniUnlockCelebration, setShowNandhiniUnlockCelebration] = useState(false);

  const [openedChestIndex, setOpenedChestIndex] = useState<number | null>(null);
  const [claimedChests, setClaimedChests] = useState<Set<number>>(new Set());

  const [activeNode, setActiveNode] = useState<PathNode | null>(null);

  const fetchPath = async (opts?: LearningPathGenerateOptions) => {
    if (!documentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.generateLearningPath(documentId, opts);
      setPath(res);
      if (opts?.lesson_depth) {
        setLessonDepth(opts.lesson_depth);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize learning path');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPath();
    setCheerQuote(companionService.getRandomCheer());

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [documentId]);

  useEffect(() => {
    if (path && path.total_units > 0) {
      const pct = Math.round((path.completed_units / path.total_units) * 100);
      const justUnlocked = companionService.setOverallProgress(pct);
      if (justUnlocked) {
        soundManager.playVictory();
        triggerConfetti();
        setShowNandhiniUnlockCelebration(true);
      }
    }
  }, [path]);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleOpenChest = (chestIdx: number) => {
    soundManager.playVictory();
    triggerConfetti();
    setOpenedChestIndex(chestIdx);
    setClaimedChests(prev => new Set(prev).add(chestIdx));
    xpService.awardXp(50, 'Milestone Chest Unlocked');
  };

  const handleOpenNode = (node: PathNode) => {
    // Side trails are always open; main nodes follow lock rules
    const isMainLocked = (node.trail_type ?? 'main') === 'main' && node.is_locked;
    if (isMainLocked) return;
    setActiveNode(node);
    setCheerQuote(companionService.getRandomCheer());
  };

  // ---------------------------------------------------------------------------
  // Derived dungeon map data
  // ---------------------------------------------------------------------------
  const mainNodes = path ? path.nodes.filter(n => (n.trail_type ?? 'main') === 'main') : [];
  const sideTrailsByParent: Record<number, PathNode[]> = {};
  if (path) {
    path.nodes.filter(n => (n.trail_type ?? 'main') !== 'main').forEach(n => {
      const parentIdx = n.branch_from_unit_index ?? 0;
      if (!sideTrailsByParent[parentIdx]) sideTrailsByParent[parentIdx] = [];
      sideTrailsByParent[parentIdx].push(n);
    });
  }

  const totalNodes = path ? path.nodes.length : 0;
  const exploredCount = path ? path.nodes.filter(n => n.is_completed).length : 0;
  const explorationPct = totalNodes > 0 ? Math.round((exploredCount / totalNodes) * 100) : 0;
  const mainProgress = mainNodes.filter(n => n.is_completed).length;

  const progressPercent = path && path.total_units > 0
    ? Math.round((path.completed_units / path.total_units) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ------------------------------------------------------------------ */}
      {/* Top Banner                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        background: 'var(--color-green)',
        borderBottom: '4px solid var(--color-green-dark)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1.5rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 12px rgba(88, 204, 2, 0.25)'
      }}>
        <div>
          {path && (
            <Link to="/" style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ← All Collections
            </Link>
          )}
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '0.25rem', letterSpacing: '0.5px' }}>
            {path?.title.replace('Path: ', '') || 'Learning Journey'}
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: '0.1rem 0 0 0' }}>
            Dungeon quest with {activeCompanion.name}! Explore every trail for maximum XP.
          </p>

          {/* Exploration meters */}
          {path && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.95 }}>
                ⚔️ Main Quest: {mainProgress}/{mainNodes.length}
              </span>
              <span style={{ fontSize: '0.78rem', opacity: 0.95 }}>
                🗺️ Dungeon Explored: {explorationPct}%&nbsp;
                ({exploredCount}/{totalNodes} locations)
              </span>
              {explorationPct === 100 && (
                <span style={{
                  fontSize: '0.75rem',
                  background: '#e8b400',
                  color: '#000',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 900
                }}>
                  👑 DUNGEON MASTER!
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="badge badge-xp" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            ⚡ {progressPercent}% Completed
          </div>
          {documentId && (
            <Link
              to={`/documents/${documentId}/preview`}
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Open full document in the PDF Reader with highlighters"
            >
              📖 Open in PDF Reader
            </Link>
          )}
          <button
            className="btn-3d btn-3d-white"
            onClick={() => fetchPath({ force_regenerate: true, lesson_depth: 'standard' })}
            title="Re-chunk path into granular 4-8 slide stepping stones"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
          >
            🔄 Re-chunk
          </button>
          <button
            className="btn-3d btn-3d-white"
            onClick={handleToggleSound}
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
          >
            {isMuted ? '🔇 Muted' : '🔊 Sound'}
          </button>
          <button
            className="btn-3d btn-3d-white"
            onClick={() => setShowSandboxModal(true)}
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
          >
            ⚙️ Sandbox Scope
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Trail Legend                                                        */}
      {/* ------------------------------------------------------------------ */}
      {path && !loading && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '0.5rem 0'
        }}>
          {Object.entries(TRAIL_STYLES).map(([key, s]) => (
            <div key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: s.color,
              background: s.bg,
              border: `1.5px solid ${s.border}`,
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
            }}>
              {s.icon} {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main Content                                                        */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'gentlePulse 1.5s infinite' }}>🗺️</div>
          <h3 style={{ fontWeight: 800 }}>Generating your dungeon map...</h3>
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-red)' }}>
          <p style={{ color: 'var(--color-red-dark)', fontWeight: 700 }}>{error}</p>
        </div>
      ) : path && path.nodes ? (

        /* ---------------------------------------------------------------- */
        /* DUNGEON MAP                                                       */
        /* ---------------------------------------------------------------- */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0.5rem', gap: '0', width: '100%', overflowX: 'hidden' }}>

          {/* Re-chunk tip for short paths */}
          {mainNodes.length <= 4 && (
            <div className="card" style={{
              width: '100%',
              maxWidth: '640px',
              padding: '1rem 1.25rem',
              background: 'rgba(88, 204, 2, 0.08)',
              border: '2px dashed var(--color-green)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-green-dark)' }}>
                  ⚡ Granular 4–8 Slide Standard
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  This map has {mainNodes.length} main nodes. Re-chunk for a fuller dungeon with more branching trails.
                </div>
              </div>
              <button
                onClick={() => fetchPath({ force_regenerate: true, lesson_depth: 'standard' })}
                className="btn-3d btn-3d-green"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                🔄 Re-chunk Now
              </button>
            </div>
          )}

          {/* Dungeon rows */}
          {mainNodes.map((mainNode, mainIdx) => {
            const branches = sideTrailsByParent[mainIdx] ?? [];
            const leftBranches = branches.filter(b => b.branch_direction === 'left');
            const rightBranches = branches.filter(b => b.branch_direction === 'right');
            const isCurrent = !mainNode.is_locked && !mainNode.is_completed;

            return (
              <div key={mainNode.id} style={{ width: '100%', maxWidth: isMobile ? '100%' : '960px' }}>

                {/* Row: left branches | main node | right branches */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isMobile ? '0.5rem' : '1rem',
                  padding: '0.5rem 0',
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                }}>

                  {/* Left branches (reverse order so closest to center is first) */}
                  {!isMobile && leftBranches.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: '0.5rem' }}>
                      {leftBranches.map(branch => (
                        <DungeonSideNode key={branch.id} node={branch} onOpen={handleOpenNode} />
                      ))}
                      {/* Connector line from main to left trails */}
                      <div style={{
                        width: `${leftBranches.length * 20}px`,
                        height: '2px',
                        background: `repeating-linear-gradient(90deg, var(--color-border-strong) 0, var(--color-border-strong) 6px, transparent 6px, transparent 12px)`,
                        opacity: 0.5,
                        flexShrink: 0,
                      }} />
                    </div>
                  )}

                  {/* Main node */}
                  <MainDungeonNode
                    node={mainNode}
                    onOpen={handleOpenNode}
                    companion={activeCompanion}
                    cheerQuote={cheerQuote}
                    isCurrent={isCurrent}
                    isMobile={isMobile}
                  />

                  {/* Right branches */}
                  {!isMobile && rightBranches.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Connector line from main to right trails */}
                      <div style={{
                        width: `${rightBranches.length * 20}px`,
                        height: '2px',
                        background: `repeating-linear-gradient(90deg, var(--color-border-strong) 0, var(--color-border-strong) 6px, transparent 6px, transparent 12px)`,
                        opacity: 0.5,
                        flexShrink: 0,
                      }} />
                      {rightBranches.map(branch => (
                        <DungeonSideNode key={branch.id} node={branch} onOpen={handleOpenNode} />
                      ))}
                    </div>
                  )}

                  {/* Mobile: stack all branches below */}
                  {isMobile && branches.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                      {branches.map(branch => (
                        <DungeonSideNode key={branch.id} node={branch} onOpen={handleOpenNode} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Vertical connector + milestone chest */}
                {mainIdx < mainNodes.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Dashed vertical spine */}
                    <div style={{
                      height: '28px',
                      width: '3px',
                      background: 'repeating-linear-gradient(180deg, var(--color-border-strong) 0, var(--color-border-strong) 5px, transparent 5px, transparent 10px)',
                      opacity: 0.5
                    }} />

                    {/* Milestone chest every 3 main nodes */}
                    {(mainIdx + 1) % 3 === 0 && (
                      <>
                        <div
                          className="reward-chest-3d"
                          onClick={() => handleOpenChest(mainIdx)}
                          title="Milestone Chest — Click to claim!"
                        >
                          {claimedChests.has(mainIdx) ? '✨' : '🎁'}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-gold-dark)', marginBottom: '4px' }}>
                          {claimedChests.has(mainIdx) ? 'Claimed ✓' : 'Milestone Chest'}
                        </span>
                        <div style={{
                          height: '20px',
                          width: '3px',
                          background: 'repeating-linear-gradient(180deg, var(--color-border-strong) 0, var(--color-border-strong) 5px, transparent 5px, transparent 10px)',
                          opacity: 0.5
                        }} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Milestone Chest Modal                                               */}
      {/* ------------------------------------------------------------------ */}
      {openedChestIndex !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎁✨</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Milestone Chest Unlocked!</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginTop: '0.5rem' }}>
              Awesome dedication! You've unlocked bonus XP and syllabus momentum!
            </p>
            <div className="badge badge-xp" style={{ fontSize: '1.25rem', padding: '0.75rem 1.5rem', margin: '1.5rem 0' }}>
              ⚡ +50 BONUS XP EARNED!
            </div>
            <button
              className="btn-3d btn-3d-green"
              onClick={() => setOpenedChestIndex(null)}
              style={{ width: '100%', padding: '0.875rem' }}
            >
              Claim & Continue Quest →
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4-Step Progressive Stepping Stone Runner                            */}
      {/* ------------------------------------------------------------------ */}
      {activeNode && (
        <SteppingStoneRunner
          node={activeNode}
          documentId={documentId || ''}
          collectionId={path?.collection_id}
          docTitle={path?.title}
          onClose={() => setActiveNode(null)}
          onNavigateToReader={(slidePage) => {
            setActiveNode(null);
            navigate(`/documents/${documentId}/preview${slidePage ? `?slide=${slidePage}` : ''}`);
          }}
          onComplete={(score, passed) => {
            if (passed && path) {
              const updatedNodes = path.nodes.map(n => {
                if (n.id === activeNode.id) {
                  return { ...n, is_completed: true, score };
                }
                return n;
              });
              // Unlock next main-path node only
              const currentIndex = path.nodes.findIndex(n => n.id === activeNode.id);
              if (currentIndex >= 0) {
                for (let i = currentIndex + 1; i < updatedNodes.length; i++) {
                  if ((updatedNodes[i].trail_type ?? 'main') === 'main' && updatedNodes[i].is_locked) {
                    updatedNodes[i] = { ...updatedNodes[i], is_locked: false };
                    break;
                  }
                }
              }
              const completedCount = updatedNodes.filter(n => n.is_completed).length;
              setPath({
                ...path,
                nodes: updatedNodes,
                completed_units: completedCount
              });

              const pct = (completedCount / updatedNodes.length) * 100;
              const justUnlocked = companionService.setOverallProgress(pct);
              if (justUnlocked) {
                setShowNandhiniUnlockCelebration(true);
                soundManager.playVictory();
                triggerConfetti();
              }
            }
          }}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Floating AI Pet Study Assistant                                     */}
      {/* ------------------------------------------------------------------ */}
      <PetAssistantChat
        currentTopic={activeNode?.title || path?.title}
        contextText={activeNode?.substantive_content?.overview || activeNode?.concept_summary}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Sandbox Scope Modal                                                 */}
      {/* ------------------------------------------------------------------ */}
      {showSandboxModal && (
        <SandboxSetupModal
          totalPages={path?.nodes?.length ? Math.max(...path.nodes.map(n => n.source_page || 1)) : 10}
          currentDepth={lessonDepth}
          onGenerate={fetchPath}
          onClose={() => setShowSandboxModal(false)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Nandhini 90% Mastery Unlock Celebration Modal                      */}
      {/* ------------------------------------------------------------------ */}
      {showNandhiniUnlockCelebration && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            padding: '2.5rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            borderRadius: 'var(--radius-xl)',
            border: '4px solid var(--color-green)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '3rem' }}>👑 ⭐</div>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid var(--color-green)',
              boxShadow: '0 0 20px rgba(88, 204, 2, 0.5)'
            }}>
              <img src="/avatars/nandhini_3d.png" alt="Nandhini" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text-main)', margin: 0 }}>
              Nandhini Unlocked! 🎉
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
              Phenomenal dedication! You've achieved <strong>90% syllabus mastery</strong>. Nandhini is now unlocked as your #1 Study Companion!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-green"
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                onClick={() => {
                  companionService.setActiveCompanion('nandhini');
                  setShowNandhiniUnlockCelebration(false);
                  triggerConfetti();
                }}
              >
                Set Nandhini as Active Companion ⭐
              </button>
              <button
                className="btn-3d btn-3d-white"
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setShowNandhiniUnlockCelebration(false)}
              >
                Keep Current Companion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
