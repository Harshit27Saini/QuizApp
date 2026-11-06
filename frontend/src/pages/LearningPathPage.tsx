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

export const LearningPathPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sound state
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 640);

  // Active Companion Cheerleader
  const activeCompanion = companionService.getActiveCompanion();
  const [cheerQuote, setCheerQuote] = useState<string>('');

  // Sandbox Modal State
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [lessonDepth, setLessonDepth] = useState<'sprint' | 'standard' | 'deep_dive'>('standard');
  const [showNandhiniUnlockCelebration, setShowNandhiniUnlockCelebration] = useState(false);

  // Milestone Chest Reward Modal State
  const [openedChestIndex, setOpenedChestIndex] = useState<number | null>(null);
  const [claimedChests, setClaimedChests] = useState<Set<number>>(new Set());

  // Active Stepping Stone Runner Modal
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
    if (node.is_locked) return;
    setActiveNode(node);
    setCheerQuote(companionService.getRandomCheer());
  };

  const progressPercent = path && path.total_units > 0
    ? Math.round((path.completed_units / path.total_units) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner Unit Header */}
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
          <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            Mastering syllabus concepts step-by-step with {activeCompanion.name}!
          </p>
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
            🔄 Re-chunk (4–8 Slides/Stone)
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'gentlePulse 1.5s infinite' }}>🗺️</div>
          <h3 style={{ fontWeight: 800 }}>Synthesizing your 3D learning quest path...</h3>
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-red)' }}>
          <p style={{ color: 'var(--color-red-dark)', fontWeight: 700 }}>{error}</p>
        </div>
      ) : path && path.nodes ? (
        /* Serpentine 3D Path of Diverse Nodes & Chests */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '3rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
          {/* Re-chunk callout for legacy short paths */}
          {path.nodes.length <= 6 && (
            <div className="card" style={{
              width: '100%',
              maxWidth: '640px',
              padding: '1rem 1.25rem',
              background: 'rgba(88, 204, 2, 0.12)',
              border: '2px dashed var(--color-green)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-green-dark)' }}>
                  ⚡ Granular 4–8 Slide Standard
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  This path has {path.nodes.length} stones. Re-chunking breaks long documents (e.g. 129 slides) into ~22 bite-sized stepping stones.
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

          {path.nodes.map((node, index) => {
            const offsets = isMobile ? [0, 18, 0, -18] : [0, 60, 0, -60];
            const xOffset = offsets[index % offsets.length];

            const isCurrent = !node.is_locked && !node.is_completed;
            const isCompleted = node.is_completed;
            const isLocked = node.is_locked;

            const nodeTypeIcon = node.node_type === 'checkpoint'
              ? '🏆'
              : node.node_type === 'scenario'
              ? '🎭'
              : '📖';

            const showChest = index > 0 && index % 3 === 0;

            return (
              <React.Fragment key={node.id}>
                {/* Milestone Reward Chest between units */}
                {showChest && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      className="reward-chest-3d"
                      onClick={() => handleOpenChest(index)}
                      title="Click to claim Milestone Reward Chest!"
                    >
                      {claimedChests.has(index) ? '✨' : '🎁'}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold-dark)' }}>
                      {claimedChests.has(index) ? 'Claimed ✓' : 'Milestone Chest'}
                    </span>
                  </div>
                )}

                {/* Stepping Stone Node */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: `translateX(${xOffset}px)`,
                    transition: 'transform var(--transition-normal)',
                    position: 'relative'
                  }}
                >
                  {/* Floating Companion Cheerleader standing beside or above current node */}
                  {isCurrent && (
                    <div style={{
                      position: 'absolute',
                      left: isMobile ? '50%' : (xOffset >= 0 ? '-140px' : '96px'),
                      top: isMobile ? '-96px' : '-10px',
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
                        {companionService.getAvatarUrl(activeCompanion) ? (
                          <img
                            src={companionService.getAvatarUrl(activeCompanion)}
                            alt={activeCompanion.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          activeCompanion.avatarIcon
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: activeCompanion.badgeColor }}>
                        {activeCompanion.name}
                      </span>
                    </div>
                  )}

                  {/* 3D Stepping Stone Button */}
                  <div
                    onClick={() => handleOpenNode(node)}
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

                  {/* Node Title Label */}
                  <div style={{
                    marginTop: '0.75rem',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '190px',
                    color: isLocked ? 'var(--color-text-subtle)' : node.is_challenge_trail ? 'var(--color-gold)' : 'var(--color-text-main)'
                  }}>
                    {node.title}
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {node.is_challenge_trail ? (
                      <span className="badge badge-xp" style={{ fontSize: '0.7rem' }}>
                        👑 +75 XP GAUNTLET
                      </span>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.7rem', background: '#ffffff', border: '1.5px solid var(--color-border)' }}>
                        {node.node_type === 'checkpoint' ? 'Checkpoint' : node.node_type === 'scenario' ? 'Scenario' : 'Lesson'}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="badge badge-mode" style={{ fontSize: '0.7rem' }}>
                        START
                      </span>
                    )}
                    {isCompleted && (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        MASTERED ✓
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      {/* Milestone Chest Opened Modal */}
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

      {/* 4-Step Progressive Stepping Stone Runner */}
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
              // Unlock next sequential node
              const currentIndex = path.nodes.findIndex(n => n.id === activeNode.id);
              if (currentIndex >= 0 && currentIndex < path.nodes.length - 1) {
                updatedNodes[currentIndex + 1].is_locked = false;
              }
              const completedCount = updatedNodes.filter(n => n.is_completed).length;
              setPath({
                ...path,
                nodes: updatedNodes,
                completed_units: completedCount
              });

              // Check for Nandhini 90% unlock
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

      {/* Floating AI Pet Study Assistant */}
      <PetAssistantChat
        currentTopic={activeNode?.title || path?.title}
        contextText={activeNode?.substantive_content?.overview || activeNode?.concept_summary}
      />

      {/* Sandbox Scope & Range Configuration Modal */}
      {showSandboxModal && (
        <SandboxSetupModal
          totalPages={path?.nodes?.length ? Math.max(...path.nodes.map(n => n.source_page || 1)) : 10}
          currentDepth={lessonDepth}
          onGenerate={fetchPath}
          onClose={() => setShowSandboxModal(false)}
        />
      )}

      {/* Nandhini 90% Mastery Unlock Celebration Modal */}
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
