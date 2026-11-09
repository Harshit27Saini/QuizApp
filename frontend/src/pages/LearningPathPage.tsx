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
import { DungeonSideNode } from '../components/learning_path/DungeonSideNode';
import { MainDungeonNode } from '../components/learning_path/MainDungeonNode';
import { MilestoneChestModal } from '../components/learning_path/MilestoneChestModal';
import { NandhiniUnlockModal } from '../components/learning_path/NandhiniUnlockModal';
import { TRAIL_STYLES } from '../components/learning_path/dungeonConstants';
import type { LearningPath, PathNode, LearningPathGenerateOptions } from '../types';

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
        <div className="card" style={{
          borderLeft: '4px solid var(--color-red)',
          padding: '2.5rem 1.5rem',
          maxWidth: '640px',
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>🧭</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Learning Quest Location Unavailable</h2>
          <p style={{ color: 'var(--color-red-dark)', fontWeight: 700, margin: 0 }}>{error}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>
            If this document was opened from a previous browser session before database synchronization, head to your collection and upload your lecture notes or slides to generate an active dungeon quest.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              className="btn-3d btn-3d-green"
              onClick={() => fetchPath()}
            >
              🔄 Retry Connecting
            </button>
            <button
              className="btn-3d btn-3d-white"
              onClick={() => navigate('/')}
            >
              ← Back to Collections Dashboard
            </button>
          </div>
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
      <MilestoneChestModal
        isOpen={openedChestIndex !== null}
        onClose={() => setOpenedChestIndex(null)}
      />

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
      {/* Floating Study Companion                                            */}
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
      <NandhiniUnlockModal
        isOpen={showNandhiniUnlockCelebration}
        onSetCompanion={() => {
          companionService.setActiveCompanion('nandhini');
          setShowNandhiniUnlockCelebration(false);
          triggerConfetti();
        }}
        onClose={() => setShowNandhiniUnlockCelebration(false)}
      />
    </div>
  );
};
