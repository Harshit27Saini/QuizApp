import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { companionService } from '../services/companions';
import { questService } from '../services/quests';
import { PetAssistantChat } from '../components/learning_path/PetAssistantChat';
import { SandboxSetupModal } from '../components/learning_path/SandboxSetupModal';
import type { LearningPath, PathNode, PathNodeQuestion, LearningPathGenerateOptions } from '../types';

export const LearningPathPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sound state
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

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

  // Active Lesson Modal State
  const [activeNode, setActiveNode] = useState<PathNode | null>(null);
  const [lessonPhase, setLessonPhase] = useState<'study' | 'quiz' | 'celebration'>('study');

  // Duolingo Practice Queue & Mistake Recycling
  const [questionQueue, setQuestionQueue] = useState<PathNodeQuestion[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string; wasRecycled?: boolean } | null>(null);
  const [comboStreak, setComboStreak] = useState(0);
  const [initialTotalQuestions, setInitialTotalQuestions] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [unitResult, setUnitResult] = useState<{ score: number; passed: boolean; xp: number } | null>(null);

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
  };

  const handleOpenNode = (node: PathNode) => {
    if (node.is_locked) return;
    setActiveNode(node);
    setLessonPhase('study');
    setQuestionQueue(node.questions || []);
    setQueueIndex(0);
    setInitialTotalQuestions(node.questions?.length || 1);
    setSelectedOption(null);
    setFeedback(null);
    setComboStreak(0);
    setUnitResult(null);
    setCheerQuote(companionService.getRandomCheer());
  };

  const handleStartPractice = () => {
    if (!activeNode || !activeNode.questions || activeNode.questions.length === 0) return;
    setQuestionQueue([...activeNode.questions]);
    setQueueIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setComboStreak(0);
    setLessonPhase('quiz');
  };

  const handleSelectOption = (optId: string) => {
    if (feedback !== null) return;
    setSelectedOption(optId);
  };

  const handleCheckAnswer = () => {
    if (!activeNode || !selectedOption) return;
    const currentQ = questionQueue[queueIndex];
    if (!currentQ) return;

    const isCorrect = currentQ.correct_answers.includes(selectedOption);

    if (isCorrect) {
      soundManager.playCorrect();
      setComboStreak(prev => prev + 1);
      setFeedback({
        isCorrect: true,
        explanation: currentQ.explanation
      });
    } else {
      soundManager.playWrong();
      setComboStreak(0);
      // Recycle question: Re-queue missed question at the end of the lesson!
      setQuestionQueue(prev => [...prev, currentQ]);
      setFeedback({
        isCorrect: false,
        explanation: currentQ.explanation,
        wasRecycled: true
      });
    }
  };

  const handleNextQuestion = async () => {
    if (!activeNode) return;

    if (queueIndex < questionQueue.length - 1) {
      setQueueIndex(prev => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      // Completed all questions in queue (including recycled ones!)
      try {
        setSubmitting(true);
        soundManager.playVictory();
        triggerConfetti();

        const payload = activeNode.questions.map(q => ({
          question_id: q.id,
          selected_options: q.correct_answers
        }));

        const res = await api.completePathNode(path!.id, activeNode.id, payload);
        questService.recordProgress('learning_unit', 1);
        setUnitResult({
          score: 100,
          passed: true,
          xp: res.xp_awarded + (comboStreak >= 3 ? 15 : 0)
        });
        setPath(res.path);
        setLessonPhase('celebration');
      } catch (err: any) {
        alert(err.message || 'Failed to complete unit');
      } finally {
        setSubmitting(false);
      }
    }
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="badge badge-xp" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            ⚡ {progressPercent}% Completed
          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '3rem' }}>
          {path.nodes.map((node, index) => {
            const offsets = [0, 60, 0, -60];
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
                  {/* Floating Companion Cheerleader standing beside the current node */}
                  {isCurrent && (
                    <div style={{
                      position: 'absolute',
                      left: xOffset >= 0 ? '-140px' : '96px',
                      top: '-10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '130px',
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
                    title={isLocked ? 'Complete previous unit to unlock' : node.title}
                  >
                    {isCompleted ? '👑' : isCurrent ? nodeTypeIcon : '🔒'}
                  </div>

                  {/* Node Title Label */}
                  <div style={{
                    marginTop: '0.75rem',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '190px',
                    color: isLocked ? 'var(--color-text-subtle)' : 'var(--color-text-main)'
                  }}>
                    {node.title}
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#ffffff', border: '1.5px solid var(--color-border)' }}>
                      {node.node_type === 'checkpoint' ? 'Checkpoint' : node.node_type === 'scenario' ? 'Scenario' : 'Lesson'}
                    </span>
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

      {/* Interactive Substantive Lesson Modal */}
      {activeNode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Stage 1: Substantive Deep Study (Learn Phase) */}
            {lessonPhase === 'study' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-mode">
                    📖 Step 1: Deep Theory & Study
                  </span>
                  <button onClick={() => setActiveNode(null)} style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', background: 'none', border: 'none' }}>✕</button>
                </div>

                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{activeNode.title}</h2>
                  {activeNode.source_page && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                      Grounded in Syllabus Slide/Page {activeNode.source_page}
                    </span>
                  )}
                </div>

                {/* Substantive Theory Overview */}
                <div style={{
                  fontSize: '1rem',
                  lineHeight: 1.65,
                  color: 'var(--color-text-main)',
                  background: 'var(--color-surface-hover)',
                  padding: '1.125rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid var(--color-border)'
                }}>
                  {activeNode.substantive_content?.overview || activeNode.concept_summary}
                </div>

                {/* Core Mechanisms, Equations, or Operational Steps */}
                {activeNode.substantive_content?.mechanisms && activeNode.substantive_content.mechanisms.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      ⚙️ Core Principles & Mechanisms:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeNode.substantive_content.mechanisms.map((m, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#ffffff',
                            padding: '0.875rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '4px solid var(--color-blue)',
                            border: '1.5px solid var(--color-border)',
                            borderLeftWidth: '5px',
                            borderLeftColor: 'var(--color-blue)',
                            fontSize: '0.925rem',
                            fontWeight: 600,
                            lineHeight: 1.5
                          }}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concrete Examples */}
                {activeNode.substantive_content?.examples && activeNode.substantive_content.examples.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      💡 Concrete Application & Example:
                    </h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', background: '#ffffff', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)' }}>
                      {activeNode.substantive_content.examples.join(' ')}
                    </div>
                  </div>
                )}

                {/* Exam Pitfalls / Nuances */}
                {activeNode.substantive_content?.exam_pitfalls && (
                  <div style={{
                    background: 'var(--color-red-light)',
                    border: '2px solid var(--color-red-dark)',
                    padding: '0.875rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-main)',
                    fontWeight: 600
                  }}>
                    <strong>⚠️ Common Exam Pitfall: </strong>
                    {activeNode.substantive_content.exam_pitfalls}
                  </div>
                )}

                <button
                  className="btn-3d btn-3d-green"
                  onClick={handleStartPractice}
                  style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
                >
                  ⚡ Start Practice Check ({activeNode.questions.length} Questions) →
                </button>
              </div>
            )}

            {/* Stage 2: Practice Phase with Duolingo Mistake Recycling */}
            {lessonPhase === 'quiz' && questionQueue[queueIndex] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Progress bar within lesson */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                      Step {queueIndex + 1} of {Math.max(initialTotalQuestions, questionQueue.length)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {comboStreak >= 2 && (
                        <span className="badge badge-xp" style={{ fontSize: '0.8rem' }}>
                          🔥 {comboStreak} in a row!
                        </span>
                      )}
                      <button onClick={() => setActiveNode(null)} style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', background: 'none', border: 'none' }}>✕</button>
                    </div>
                  </div>
                  <div className="progress-container" style={{ height: '10px' }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, Math.round(((queueIndex) / Math.max(initialTotalQuestions, questionQueue.length)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.4 }}>
                  {questionQueue[queueIndex].prompt}
                </h3>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {questionQueue[queueIndex].options.map(opt => {
                    const isSelected = selectedOption === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`quiz-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(opt.id)}
                      >
                        <span style={{ fontWeight: 900, width: '28px', color: isSelected ? 'var(--color-blue-dark)' : 'var(--color-text-muted)' }}>
                          {opt.id.toUpperCase()}.
                        </span>
                        <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600 }}>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Duolingo Feedback Banner */}
                {feedback ? (
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    background: feedback.isCorrect ? 'var(--color-green-light)' : 'var(--color-red-light)',
                    border: `2px solid ${feedback.isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`,
                    borderBottomWidth: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: feedback.isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)' }}>
                      {feedback.isCorrect
                        ? comboStreak >= 3 ? `🔥 Amazing! ${comboStreak} in a row!` : '✓ Nicely done!'
                        : '✕ Let\'s review this:'}
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.4, color: 'var(--color-text-main)', fontWeight: 600 }}>
                      {feedback.explanation}
                    </div>
                    {feedback.wasRecycled && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-red-dark)' }}>
                        ↻ Missed! Re-queued to the end so you achieve 100% mastery!
                      </div>
                    )}
                    <button
                      className={`btn-3d ${feedback.isCorrect ? 'btn-3d-green' : 'btn-3d-red'}`}
                      onClick={handleNextQuestion}
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-end' }}
                      disabled={submitting}
                    >
                      {queueIndex === questionQueue.length - 1 ? 'Complete Unit →' : 'Continue →'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-3d btn-3d-green"
                    onClick={handleCheckAnswer}
                    disabled={!selectedOption}
                    style={{ padding: '0.875rem', marginTop: '0.5rem' }}
                  >
                    Check Answer
                  </button>
                )}
              </div>
            )}

            {/* Stage 3: Celebration Modal */}
            {lessonPhase === 'celebration' && unitResult && (
              <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '4rem' }}>🎉</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Unit Mastered!</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 600 }}>
                  You have conquered all concepts and questions in this unit!
                </p>

                <div className="badge badge-xp" style={{ fontSize: '1.25rem', padding: '0.75rem 1.75rem' }}>
                  ⚡ +{unitResult.xp} XP Earned!
                </div>

                <button
                  className="btn-3d btn-3d-green"
                  onClick={() => setActiveNode(null)}
                  style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem', marginTop: '1rem' }}
                >
                  Continue Quest Path →
                </button>
              </div>
            )}
          </div>
        </div>
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
