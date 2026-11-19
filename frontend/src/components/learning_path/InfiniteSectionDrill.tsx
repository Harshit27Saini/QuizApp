import React, { useState, useEffect } from 'react';
import type { PathNode, PathNodeQuestion } from '../../types';
import { api } from '../../services/api';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';
import { xpService } from '../../services/xp';

interface InfiniteSectionDrillProps {
  pathId: string;
  documentId: string;
  nodes: PathNode[];
  onOpenCompanionChat?: (topic: string, context: string) => void;
}

export const InfiniteSectionDrill: React.FC<InfiniteSectionDrillProps> = ({
  pathId,
  documentId,
  nodes,
  onOpenCompanionChat,
}) => {
  // Filter only valid content nodes (lessons, challenges, deep dives, boss nodes)
  const studyUnits = nodes.length > 0 ? nodes : [];

  // Active section index
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const currentUnit = studyUnits[selectedUnitIndex] || studyUnits[0];

  // Dynamic question bank for the current section
  const [questionBank, setQuestionBank] = useState<PathNodeQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

  // Stats for the active section drill session
  const [sectionAnsweredCount, setSectionAnsweredCount] = useState<number>(0);
  const [sectionCorrectCount, setSectionCorrectCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [sectionCompletedModal, setSectionCompletedModal] = useState<boolean>(false);

  // Initialize or reload questions when unit changes
  useEffect(() => {
    if (!currentUnit) return;

    // Start with the unit's pre-generated questions
    const initialQuestions: PathNodeQuestion[] = (currentUnit.questions || []).map((q, idx) => ({
      id: q.id || `q-${selectedUnitIndex}-${idx}`,
      prompt: q.prompt,
      options: q.options || [],
      correct_answers: q.correct_answers || [],
      explanation: q.explanation || 'Grounded in this section material.'
    }));

    // If unit has fewer than 3 questions, synthesize local fallback questions from mechanisms
    if (initialQuestions.length < 3 && currentUnit.substantive_content?.mechanisms) {
      currentUnit.substantive_content.mechanisms.forEach((m, idx) => {
        const parts = m.split(':');
        const term = parts[0]?.trim() || `Concept ${idx + 1}`;
        const desc = parts[1]?.trim() || m;
        initialQuestions.push({
          id: `synth-${selectedUnitIndex}-${idx}`,
          prompt: `In the context of ${currentUnit.title}: Which statement accurately describes ${term}?`,
          options: [
            { id: 'a', text: desc },
            { id: 'b', text: 'It functions as an unmonitored bypass state without threshold limits.' },
            { id: 'c', text: 'It terminates upstream signaling regardless of metabolic requirements.' },
            { id: 'd', text: 'It reverses transport polarity under ambient equilibrium.' }
          ],
          correct_answers: ['a'],
          explanation: `Syllabus reference: ${m}`
        });
      });
    }

    setQuestionBank(initialQuestions);
    setCurrentQIndex(0);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setSectionAnsweredCount(0);
    setSectionCorrectCount(0);
  }, [selectedUnitIndex, currentUnit?.id]);

  const activeQuestion = questionBank[currentQIndex];

  // Option selection & instant grading
  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return;
    setSelectedOptionId(optionId);
    setIsSubmitted(true);

    const isCorrect = activeQuestion?.correct_answers?.includes(optionId);
    setSectionAnsweredCount(prev => prev + 1);

    if (isCorrect) {
      soundManager.playCorrect();
      setSectionCorrectCount(prev => prev + 1);
      setStreak(prev => prev + 1);
      xpService.awardXp(10, 'Infinite Drill Correct');
      if ((streak + 1) % 5 === 0) {
        triggerConfetti();
      }
    } else {
      soundManager.playWrong();
      setStreak(0);
    }
  };

  // Move to next question or generate more
  const handleNextQuestion = async () => {
    if (currentQIndex < questionBank.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
    } else {
      // Fetch or generate fresh questions for this section
      setIsFetchingMore(true);
      try {
        const fresh = await api.getDrillQuestions(pathId, currentUnit.unit_index, {
          document_id: documentId,
          count: 4
        });
        if (fresh && fresh.length > 0) {
          const formatted: PathNodeQuestion[] = fresh.map((q: any, i: number) => ({
            id: q.id || `fresh-${Date.now()}-${i}`,
            prompt: q.prompt,
            options: q.options || [],
            correct_answers: q.correct_answers || [],
            explanation: q.explanation || 'Grounded in section text.'
          }));
          setQuestionBank(prev => [...prev, ...formatted]);
          setCurrentQIndex(prev => prev + 1);
          setSelectedOptionId(null);
          setIsSubmitted(false);
        } else {
          // Loop through existing questions for spaced repetition review
          setCurrentQIndex(0);
          setSelectedOptionId(null);
          setIsSubmitted(false);
        }
      } catch {
        // Safe loop-around review
        setCurrentQIndex(0);
        setSelectedOptionId(null);
        setIsSubmitted(false);
      } finally {
        setIsFetchingMore(false);
      }
    }
  };

  // Advance to Next Section
  const handleAdvanceSection = () => {
    soundManager.playVictory();
    triggerConfetti();
    xpService.awardXp(35, `Mastered Section: ${currentUnit.title}`);
    setSectionCompletedModal(true);
  };

  const confirmMoveToNextSection = () => {
    setSectionCompletedModal(false);
    if (selectedUnitIndex < studyUnits.length - 1) {
      setSelectedUnitIndex(prev => prev + 1);
    } else {
      // Loop or restart first section
      setSelectedUnitIndex(0);
    }
  };

  if (!currentUnit) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No study sections available. Generate a learning path first.
      </div>
    );
  }

  const accuracyPct = sectionAnsweredCount > 0 ? Math.round((sectionCorrectCount / sectionAnsweredCount) * 100) : 0;
  const slideStart = currentUnit.slide_start || currentUnit.source_page || 1;
  const slideEnd = currentUnit.slide_end || slideStart;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Section Selector Strip & Progress Stepper                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-mode" style={{ fontSize: '0.7rem' }}>
                SECTION {selectedUnitIndex + 1} OF {studyUnits.length}
              </span>
              <span className="badge" style={{ background: 'rgba(28, 176, 246, 0.15)', color: 'var(--color-blue)', fontSize: '0.7rem', fontWeight: 800 }}>
                📑 SLIDES {slideStart}{slideEnd > slideStart ? `–${slideEnd}` : ''}
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: 'var(--color-text-main)' }}>
              {currentUnit.title}
            </h2>
          </div>

          {/* Stepper Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn-3d btn-3d-white"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              disabled={selectedUnitIndex === 0}
              onClick={() => setSelectedUnitIndex(prev => prev - 1)}
            >
              ← Prev Section
            </button>
            <button
              className="btn-3d btn-3d-green"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              onClick={handleAdvanceSection}
            >
              Next Section →
            </button>
          </div>
        </div>

        {/* Section Quick-Switch Strip */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin'
        }}>
          {studyUnits.map((u, idx) => {
            const isSelected = idx === selectedUnitIndex;
            return (
              <button
                key={u.id || idx}
                onClick={() => setSelectedUnitIndex(idx)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 800 : 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {idx + 1}. {u.title.slice(0, 24)}{u.title.length > 24 ? '...' : ''}
              </button>
            );
          })}
        </div>

        {/* Real-Time Live Session Stats */}
        <div style={{
          display: 'flex',
          gap: '1.25rem',
          background: 'var(--color-bg)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>🎯 Section Accuracy:</span>
            <span style={{ color: accuracyPct >= 70 ? 'var(--color-green)' : accuracyPct > 0 ? 'var(--color-orange)' : 'var(--color-text-muted)' }}>
              {accuracyPct}% ({sectionCorrectCount}/{sectionAnsweredCount})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>🔥 Streak:</span>
            <span style={{ color: 'var(--color-orange-dark)' }}>{streak} in a row</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800 }}>
            <span>⚡ Question:</span>
            <span style={{ color: 'var(--color-text-main)' }}>{currentQIndex + 1} of {questionBank.length}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Active Question Card                                               */}
      {/* ------------------------------------------------------------------ */}
      {activeQuestion ? (
        <div className="card" style={{
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          borderRadius: 'var(--radius-xl)',
          border: '2px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Question Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <span className="badge badge-xp" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                +10 XP PER CORRECT ANSWER
              </span>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                lineHeight: 1.45,
                margin: '0.35rem 0 0 0',
                color: 'var(--color-text-main)'
              }}>
                {activeQuestion.prompt}
              </h3>
            </div>

            {onOpenCompanionChat && (
              <button
                className="btn-3d btn-3d-white"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={() => onOpenCompanionChat(
                  activeQuestion.prompt,
                  currentUnit.concept_summary || currentUnit.title
                )}
                title="Ask your active study companion about this question"
              >
                🐾 Ask Buddy
              </button>
            )}
          </div>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeQuestion.options.map((opt) => {
              const isChosen = selectedOptionId === opt.id;
              const isCorrectAnswer = activeQuestion.correct_answers.includes(opt.id);

              let optionStyle = 'var(--color-surface)';
              let borderStyle = '2px solid var(--color-border)';
              let textColor = 'var(--color-text-main)';

              if (isSubmitted) {
                if (isCorrectAnswer) {
                  optionStyle = 'rgba(88, 204, 2, 0.15)';
                  borderStyle = '2px solid var(--color-green)';
                  textColor = 'var(--color-green-dark)';
                } else if (isChosen) {
                  optionStyle = 'rgba(255, 75, 75, 0.15)';
                  borderStyle = '2px solid var(--color-red)';
                  textColor = 'var(--color-red-dark)';
                }
              } else if (isChosen) {
                optionStyle = 'var(--color-primary-light)';
                borderStyle = '2px solid var(--color-primary)';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={isSubmitted}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    background: optionStyle,
                    border: borderStyle,
                    color: textColor,
                    cursor: isSubmitted ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                    boxShadow: isChosen && !isSubmitted ? '0 0 0 2px var(--color-primary)' : 'none'
                  }}
                >
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isSubmitted && isCorrectAnswer ? 'var(--color-green)' : isSubmitted && isChosen ? 'var(--color-red)' : 'var(--color-bg)',
                    color: isSubmitted && (isCorrectAnswer || isChosen) ? '#fff' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{opt.text}</span>
                  {isSubmitted && isCorrectAnswer && <span>✓</span>}
                  {isSubmitted && isChosen && !isCorrectAnswer && <span>✕</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation Box (Revealed after answering) */}
          {isSubmitted && (
            <div style={{
              background: 'var(--color-bg)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              borderLeft: `4px solid ${activeQuestion.correct_answers.includes(selectedOptionId || '') ? 'var(--color-green)' : 'var(--color-red)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease-in'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                  {activeQuestion.correct_answers.includes(selectedOptionId || '') ? '🎉 Correct Explanation:' : '💡 Learning Breakdown:'}
                </span>
                <span className="badge" style={{ fontSize: '0.65rem' }}>
                  Slides {slideStart}–{slideEnd}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-main)' }}>
                {activeQuestion.explanation}
              </p>
            </div>
          )}

          {/* Action Row */}
          {isSubmitted && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-white"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
                onClick={handleAdvanceSection}
              >
                🚀 Satisfied? Move to Next Section →
              </button>

              <button
                className="btn-3d btn-3d-green"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}
                onClick={handleNextQuestion}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? 'Generating Fresh Questions...' : 'Next Question ⚡'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>Loading questions for {currentUnit.title}...</h3>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section Advancement Celebration Modal                              */}
      {/* ------------------------------------------------------------------ */}
      {sectionCompletedModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
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
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '3rem' }}>🏆 ⭐</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
              Section Drill Milestone!
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Great active recall practice! You answered <strong>{sectionAnsweredCount} questions</strong> with <strong>{accuracyPct}% accuracy</strong> on <em>{currentUnit.title}</em>.
            </p>
            <div className="badge badge-xp" style={{ fontSize: '1.1rem', padding: '0.5rem 1.25rem' }}>
              ⚡ +35 MILESTONE XP EARNED!
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-green"
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={confirmMoveToNextSection}
              >
                Advance to Section {Math.min(selectedUnitIndex + 2, studyUnits.length)} →
              </button>
              <button
                className="btn-3d btn-3d-white"
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setSectionCompletedModal(false)}
              >
                Keep Drilling This Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
