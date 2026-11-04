import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
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

  // Sandbox Modal State
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [lessonDepth, setLessonDepth] = useState<'sprint' | 'standard' | 'deep_dive'>('standard');

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
  }, [documentId]);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
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

        // Complete unit and unlock next node
        const payload = activeNode.questions.map(q => ({
          question_id: q.id,
          selected_options: q.correct_answers
        }));

        const res = await api.completePathNode(path!.id, activeNode.id, payload);
        setUnitResult({
          score: 100,
          passed: true,
          xp: res.xp_awarded + (comboStreak >= 3 ? 10 : 0)
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
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Bar */}
      <div>
        {path && (
          <Link to={`/collections/${path.collection_id}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
            ← Back to Collection
          </Link>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {path?.title.replace('Path: ', '') || 'Learning Journey'}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Master substantive theory step-by-step with your pet study companions.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleToggleSound}
              title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
            >
              {isMuted ? '🔇 Muted' : '🔊 Sound'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSandboxModal(true)}
              style={{ fontSize: '0.875rem', padding: '0.5rem 0.875rem' }}
            >
              ⚙️ Sandbox Scope
            </button>
            <div className="badge badge-xp" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              ⚡ Path: {progressPercent}%
            </div>
          </div>
        </div>

        {/* Global Journey Progress Bar */}
        <div className="progress-container" style={{ marginTop: '1rem', height: '10px' }}>
          <div className="progress-bar" style={{ width: `${progressPercent}%`, backgroundColor: 'var(--color-xp)' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗺️</div>
          <h3>Synthesizing substantive academic curriculum & study units...</h3>
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : path && path.nodes ? (
        /* Serpentine Duolingo Path of Diverse Nodes */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '2.5rem' }}>
          {path.nodes.map((node, index) => {
            const offsets = [0, 50, 0, -50];
            const xOffset = offsets[index % offsets.length];

            const isCurrent = !node.is_locked && !node.is_completed;
            const isCompleted = node.is_completed;
            const isLocked = node.is_locked;

            const nodeTypeIcon = node.node_type === 'checkpoint'
              ? '🏆'
              : node.node_type === 'scenario'
              ? '🎭'
              : '📖';

            return (
              <div
                key={node.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: `translateX(${xOffset}px)`,
                  transition: 'transform var(--transition-normal)',
                  position: 'relative'
                }}
              >
                {/* Stepping Stone Node Button */}
                <div
                  onClick={() => handleOpenNode(node)}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isCompleted
                      ? 'var(--color-xp)'
                      : isCurrent
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                    color: '#ffffff',
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    boxShadow: isCurrent
                      ? '0 0 0 8px rgba(59, 91, 253, 0.2), var(--shadow-lg)'
                      : isCompleted
                      ? '0 0 0 6px rgba(245, 158, 11, 0.2), var(--shadow-md)'
                      : 'var(--shadow-sm)',
                    transition: 'all var(--transition-fast)'
                  }}
                  title={isLocked ? 'Complete previous unit to unlock' : node.title}
                >
                  {isCompleted ? '👑' : isCurrent ? nodeTypeIcon : '🔒'}
                </div>

                {/* Node Title Label */}
                <div style={{
                  marginTop: '0.625rem',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  maxWidth: '180px',
                  color: isLocked ? 'var(--color-text-subtle)' : 'var(--color-text-main)'
                }}>
                  {node.title}
                </div>

                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
                  <span className="badge" style={{ fontSize: '0.7rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
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
            );
          })}
        </div>
      ) : null}

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
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{activeNode.title}</h2>
                  {activeNode.source_page && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Grounded in Syllabus Slide/Page {activeNode.source_page}
                    </span>
                  )}
                </div>

                {/* Substantive Theory Overview */}
                <div style={{
                  fontSize: '0.975rem',
                  lineHeight: 1.65,
                  color: 'var(--color-text-main)',
                  background: 'var(--color-bg)',
                  padding: '1.125rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  {activeNode.substantive_content?.overview || activeNode.concept_summary}
                </div>

                {/* Core Mechanisms, Equations, or Operational Steps */}
                {activeNode.substantive_content?.mechanisms && activeNode.substantive_content.mechanisms.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      ⚙️ Core Principles & Mechanisms:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeNode.substantive_content.mechanisms.map((m, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--color-surface)',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '3px solid var(--color-primary)',
                            fontSize: '0.9rem',
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
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      💡 Concrete Application & Example:
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', background: 'var(--color-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                      {activeNode.substantive_content.examples.join(' ')}
                    </div>
                  </div>
                )}

                {/* Exam Pitfalls / Nuances */}
                {activeNode.substantive_content?.exam_pitfalls && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-main)'
                  }}>
                    <strong>⚠️ Common Exam Pitfall: </strong>
                    {activeNode.substantive_content.exam_pitfalls}
                  </div>
                )}

                <button
                  className="btn btn-primary"
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
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      Step {queueIndex + 1} of {Math.max(initialTotalQuestions, questionQueue.length)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {comboStreak >= 2 && (
                        <span className="badge badge-xp" style={{ fontSize: '0.75rem' }}>
                          🔥 {comboStreak} in a row!
                        </span>
                      )}
                      <button onClick={() => setActiveNode(null)} style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', background: 'none', border: 'none' }}>✕</button>
                    </div>
                  </div>
                  <div className="progress-container" style={{ height: '8px' }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, Math.round(((queueIndex) / Math.max(initialTotalQuestions, questionQueue.length)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.4 }}>
                  {questionQueue[queueIndex].prompt}
                </h3>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {questionQueue[queueIndex].options.map(opt => {
                    const isSelected = selectedOption === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`quiz-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(opt.id)}
                        style={{ padding: '0.875rem 1rem' }}
                      >
                        <span style={{ fontWeight: 700, width: '24px' }}>{opt.id.toUpperCase()}.</span>
                        <span style={{ flex: 1, fontSize: '0.925rem' }}>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Duolingo Feedback Banner */}
                {feedback ? (
                  <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: feedback.isCorrect ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                    border: `1.5px solid ${feedback.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ fontWeight: 800, color: feedback.isCorrect ? 'var(--color-success-dark)' : 'var(--color-error-dark)' }}>
                      {feedback.isCorrect
                        ? comboStreak >= 3 ? `🔥 Amazing! ${comboStreak} in a row!` : '✓ Nicely done!'
                        : '✕ Let\'s review this:'}
                    </div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.4, color: 'var(--color-text-main)' }}>
                      {feedback.explanation}
                    </div>
                    {feedback.wasRecycled && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-error-dark)' }}>
                        ↻ Question will appear again at the end so you achieve 100% mastery!
                      </div>
                    )}
                    <button
                      className={`btn ${feedback.isCorrect ? 'btn-success' : 'btn-primary'}`}
                      onClick={handleNextQuestion}
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-end' }}
                      disabled={submitting}
                    >
                      {queueIndex === questionQueue.length - 1 ? 'Complete Unit →' : 'Continue →'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleCheckAnswer}
                    disabled={!selectedOption}
                    style={{ padding: '0.75rem', marginTop: '0.5rem' }}
                  >
                    Check Answer
                  </button>
                )}
              </div>
            )}

            {/* Stage 3: Celebration Modal */}
            {lessonPhase === 'celebration' && unitResult && (
              <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '3.5rem' }}>🎉</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Unit Mastered!</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                  You have conquered all concepts and questions in this unit!
                </p>

                <div className="badge badge-xp" style={{ fontSize: '1.1rem', padding: '0.625rem 1.5rem' }}>
                  ⚡ +{unitResult.xp} XP Earned!
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setActiveNode(null)}
                  style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '1rem' }}
                >
                  Continue Learning Journey →
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
    </div>
  );
};
