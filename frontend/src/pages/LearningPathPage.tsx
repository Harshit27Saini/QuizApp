import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { LearningPath, PathNode } from '../types';

export const LearningPathPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Lesson Modal State
  const [activeNode, setActiveNode] = useState<PathNode | null>(null);
  const [lessonPhase, setLessonPhase] = useState<'study' | 'quiz' | 'celebration'>('study');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unitResult, setUnitResult] = useState<{ score: number; passed: boolean; xp: number } | null>(null);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    api.generateLearningPath(documentId)
      .then(p => setPath(p))
      .catch(err => setError(err.message || 'Failed to initialize learning path'))
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleOpenNode = (node: PathNode) => {
    if (node.is_locked) return;
    setActiveNode(node);
    setLessonPhase('study');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuestionAnswers({});
    setFeedback(null);
    setUnitResult(null);
  };

  const handleStartQuiz = () => {
    setLessonPhase('quiz');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setFeedback(null);
  };

  const handleSelectOption = (optId: string) => {
    if (feedback !== null) return; // Prevent changing after checking
    setSelectedOption(optId);
  };

  const handleCheckAnswer = () => {
    if (!activeNode || !selectedOption) return;
    const q = activeNode.questions[currentQuestionIndex];
    const isCorrect = q.correct_answers.includes(selectedOption);

    setQuestionAnswers(prev => ({ ...prev, [q.id]: selectedOption }));
    setFeedback({
      isCorrect,
      explanation: q.explanation
    });
  };

  const handleNextQuestion = async () => {
    if (!activeNode) return;
    const totalQ = activeNode.questions.length;

    if (currentQuestionIndex < totalQ - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      // Completed all questions in unit, submit evaluation
      try {
        setSubmitting(true);
        const answersPayload = activeNode.questions.map(q => ({
          question_id: q.id,
          selected_options: questionAnswers[q.id] ? [questionAnswers[q.id]] : []
        }));

        const res = await api.completePathNode(path!.id, activeNode.id, answersPayload);
        setUnitResult({
          score: res.score,
          passed: res.passed,
          xp: res.xp_awarded
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
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Overall Journey Progress */}
      <div>
        {path && (
          <Link to={`/collections/${path.collection_id}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
            ← Back to Collection
          </Link>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {path?.title.replace('Path: ', '') || 'Learning Journey'}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Master your document one bite-sized unit at a time.
            </p>
          </div>
          <div className="badge badge-xp" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
            ⚡ Path: {progressPercent}%
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
          <h3>Structuring document curriculum into progressive units...</h3>
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : path && path.nodes ? (
        /* Serpentine Duolingo Path of Nodes */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '2.5rem' }}>
          {path.nodes.map((node, index) => {
            // Serpentine zig-zag offset pattern
            const offsets = [0, 50, 0, -50];
            const xOffset = offsets[index % offsets.length];

            const isCurrent = !node.is_locked && !node.is_completed;
            const isCompleted = node.is_completed;
            const isLocked = node.is_locked;

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
                  {isCompleted ? '👑' : isCurrent ? '⚡' : '🔒'}
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

                {isCurrent && (
                  <span className="badge badge-mode" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                    START UNIT
                  </span>
                )}
                {isCompleted && (
                  <span className="badge badge-success" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                    PASSED ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Interactive Lesson Modal */}
      {activeNode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Phase 1: 1-Minute Concept Bite */}
            {lessonPhase === 'study' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-mode">📖 60-Second Study Bite</span>
                  <button onClick={() => setActiveNode(null)} style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{activeNode.title}</h2>

                <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-main)', background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  {activeNode.concept_summary}
                </p>

                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    Core Key Takeaways:
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.925rem', lineHeight: 1.5 }}>
                    {activeNode.key_takeaways.map((item, idx) => (
                      <li key={idx} style={{ color: 'var(--color-text-main)' }}>
                        <strong>{item}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <button className="btn btn-primary" onClick={handleStartQuiz} style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}>
                  ⚡ Start Quick Check ({activeNode.questions.length} Questions) →
                </button>
              </div>
            )}

            {/* Phase 2: Quick Check Mini-Quiz */}
            {lessonPhase === 'quiz' && activeNode.questions[currentQuestionIndex] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Header with dots */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    Question {currentQuestionIndex + 1} of {activeNode.questions.length}
                  </span>
                  <button onClick={() => setActiveNode(null)} style={{ fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.4 }}>
                  {activeNode.questions[currentQuestionIndex].prompt}
                </h3>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {activeNode.questions[currentQuestionIndex].options.map(opt => {
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

                {/* Bottom Feedback Banner (Duolingo style) */}
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
                      {feedback.isCorrect ? '✓ Nicely done!' : '✕ Let\'s review this:'}
                    </div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.4, color: 'var(--color-text-main)' }}>
                      {feedback.explanation}
                    </div>
                    <button
                      className={`btn ${feedback.isCorrect ? 'btn-success' : 'btn-primary'}`}
                      onClick={handleNextQuestion}
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-end' }}
                      disabled={submitting}
                    >
                      {currentQuestionIndex === activeNode.questions.length - 1 ? 'Finish Unit →' : 'Continue →'}
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

            {/* Phase 3: Celebration Modal */}
            {lessonPhase === 'celebration' && unitResult && (
              <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '3.5rem' }}>
                  {unitResult.passed ? '🎉' : '💪'}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {unitResult.passed ? 'Unit Complete!' : 'Keep Practicing!'}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                  You scored <strong>{Math.round(unitResult.score)}%</strong> on this unit.
                </p>

                <div className="badge badge-xp" style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
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
    </div>
  );
};
