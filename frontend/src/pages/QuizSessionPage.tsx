import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { QuestionPublic } from '../types';

export const QuizSessionPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [startTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!quizId) return;

    try {
      setSubmitting(true);
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

      navigate(`/attempts/${result.id}/result`);
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

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Progress Header */}
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

      {/* Question Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.4, marginBottom: '1.5rem' }}>
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

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0 || submitting}
        >
          ← Previous
        </button>

        {isLastQuestion ? (
          <button
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Grading answers...' : 'Complete & Submit Quiz ✓'}
          </button>
        ) : (
          <button
            className="btn btn-primary"
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
