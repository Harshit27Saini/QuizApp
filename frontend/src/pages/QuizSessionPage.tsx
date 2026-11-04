import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import type { QuestionPublic } from '../types';

export const QuizSessionPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Exam hall configuration from navigation state
  const examState = location.state as {
    isExamMode?: boolean;
    timeLimitMinutes?: number;
    negativeMarking?: number;
  } | undefined;

  const isExamMode = examState?.isExamMode ?? false;
  const timeLimitMinutes = examState?.timeLimitMinutes ?? 15;
  const negativeMarking = examState?.negativeMarking ?? 0;
  const initialTimeSeconds = timeLimitMinutes * 60;

  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeSeconds);
  const [startTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer countdown for Exam Mode
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    api.getQuiz(quizId)
      .then(q => {
        setQuestions(q.questions || []);
      })
      .catch(err => setError(err.message || 'Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [quizId]);

  useEffect(() => {
    if (!isExamMode || loading || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        if (prev <= 30 && prev % 2 === 0) {
          soundManager.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isExamMode, loading, questions.length]);

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const handleOptionToggle = (optionId: string) => {
    if (!currentQ) return;
    const isMsq = currentQ.question_type === 'MSQ';
    const currentSelected = selectedAnswers[currentQ.id] || [];

    if (isMsq) {
      const next = currentSelected.includes(optionId)
        ? currentSelected.filter(id => id !== optionId)
        : [...currentSelected, optionId];
      setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: next });
    } else {
      setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: [optionId] });
    }
  };

  const toggleFlagCurrent = () => {
    if (!currentQ) return;
    setFlaggedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id);
      } else {
        next.add(currentQ.id);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quizId || submitting) return;

    try {
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const answersPayload = questions.map(q => ({
        question_id: q.id,
        selected_options: selectedAnswers[q.id] || [],
        time_spent_seconds: 0
      }));

      const result = await api.submitAttempt({
        quiz_id: quizId,
        time_taken_seconds: timeTaken,
        answers: answersPayload
      });

      navigate(`/attempts/${result.id}/result`, {
        state: {
          isExamMode,
          negativeMarking,
          timeLimitMinutes,
          timeTakenSeconds: timeTaken
        }
      });
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz attempt');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Preparing questions...</div>;
  }

  if (error || !currentQ) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
        <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error || 'No questions available.'}</p>
      </div>
    );
  }

  const currentSelectedOptions = selectedAnswers[currentQ.id] || [];
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isCurrentFlagged = flaggedQuestionIds.has(currentQ.id);

  // Stats calculation
  const answeredCount = Object.values(selectedAnswers).filter(arr => arr.length > 0).length;
  const flaggedCount = flaggedQuestionIds.size;
  const unansweredCount = totalQuestions - answeredCount;

  // Format timer
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isTimeCritical = timeLeft < 60;
  const isTimeWarning = timeLeft < 180;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Exam Mode Timer & Live Status Header */}
      {isExamMode ? (
        <div className="card" style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: isTimeCritical ? 'rgba(255, 75, 75, 0.15)' : 'var(--color-surface)',
          border: `2px solid ${isTimeCritical ? 'var(--color-error)' : isTimeWarning ? 'var(--color-gold)' : 'var(--color-border)'}`
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ background: 'var(--color-blue)', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>
                🏛️ EXAM HALL MODE
              </span>
              {negativeMarking > 0 && (
                <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>
                  -{negativeMarking} Penalty
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              {answeredCount} Answered • {flaggedCount} Flagged • {unansweredCount} Left
            </div>
          </div>

          {/* Countdown Clock */}
          <div style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: isTimeCritical ? 'var(--color-error)' : isTimeWarning ? 'var(--color-gold-dark)' : 'var(--color-text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: isTimeCritical ? 'pulse 1s infinite' : 'none'
          }}>
            <span>⏱️</span>
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      ) : (
        /* Standard Quiz Progress Header */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="badge badge-mode">
              {currentQ.question_type === 'MSQ' ? 'Multi-Select (Select all that apply)' : 'Single Choice (MCQ)'}
            </span>
          </div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Question {currentIndex + 1}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={toggleFlagCurrent}
              className={`btn-3d ${isCurrentFlagged ? 'btn-3d-gold' : 'btn-3d-white'}`}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            >
              {isCurrentFlagged ? '🚩 Flagged' : '🏳️ Flag for Review'}
            </button>
          </div>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.4, margin: 0 }}>
          {currentQ.prompt}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentQ.options.map(option => {
            const isSelected = currentSelectedOptions.includes(option.id);
            return (
              <div
                key={option.id}
                className={`quiz-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleOptionToggle(option.id)}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: currentQ.question_type === 'MSQ' ? 'var(--radius-sm)' : 'var(--radius-full)',
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  flexShrink: 0
                }}>
                  {option.id.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                  {option.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Navigator Palette Grid (Exam Hall Style) */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            Question Palette
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
            <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>● Answered</span>
            <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>● Flagged</span>
            <span style={{ color: 'var(--color-text-subtle)', fontWeight: 700 }}>● Unattempted</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {questions.map((q, idx) => {
            const hasAnswer = (selectedAnswers[q.id] || []).length > 0;
            const isFlagged = flaggedQuestionIds.has(q.id);
            const isCurrent = idx === currentIndex;

            let bgColor = 'var(--color-bg)';
            let borderColor = 'var(--color-border)';
            let textColor = 'var(--color-text-main)';

            if (isFlagged) {
              bgColor = 'var(--color-gold)';
              borderColor = 'var(--color-gold-dark)';
              textColor = '#fff';
            } else if (hasAnswer) {
              bgColor = 'var(--color-green)';
              borderColor = 'var(--color-green-dark)';
              textColor = '#fff';
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: bgColor,
                  border: isCurrent ? '3px solid var(--color-blue)' : `2px solid ${borderColor}`,
                  color: textColor,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-3d btn-3d-white"
          onClick={handlePrev}
          disabled={currentIndex === 0 || submitting}
        >
          ← Previous
        </button>

        {isLastQuestion ? (
          <button
            className="btn-3d btn-3d-green"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Grading answers...' : 'Complete & Submit Exam ✓'}
          </button>
        ) : (
          <button
            className="btn-3d btn-3d-blue"
            onClick={handleNext}
            disabled={submitting}
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
};
