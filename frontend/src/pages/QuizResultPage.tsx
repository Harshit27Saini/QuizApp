import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AttemptResult } from '../types';

export const QuizResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    api.getAttemptResult(attemptId)
      .then(res => setResult(res))
      .catch(err => setError(err.message || 'Failed to load attempt results'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>Calculating results and analysis...</div>;
  }

  if (error || !result) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
        <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error || 'Result not found.'}</p>
      </div>
    );
  }

  const incorrectResults = result.question_results.filter(r => !r.is_correct);
  const hasErrors = incorrectResults.length > 0;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Score Summary Header */}
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--color-surface)' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '96px',
          height: '96px',
          borderRadius: 'var(--radius-full)',
          background: result.score >= 70 ? 'var(--color-success-bg)' : 'var(--color-xp-bg)',
          color: result.score >= 70 ? 'var(--color-success-dark)' : 'var(--color-xp-dark)',
          fontSize: '2rem',
          fontWeight: 900,
          marginBottom: '1rem',
          border: `3px solid ${result.score >= 70 ? 'var(--color-success-border)' : '#fde68a'}`
        }}>
          {Math.round(result.score)}%
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {result.score === 100 ? 'Flawless Mastery! 🎉' : result.score >= 70 ? 'Great Progress! 👏' : 'Keep Practicing! 💪'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
          You answered <strong>{result.correct_count}</strong> of <strong>{result.total_questions}</strong> questions correctly in {result.time_taken_seconds} seconds.
        </p>

        <div style={{ display: 'inline-flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <span className="badge badge-xp" style={{ fontSize: '0.875rem', padding: '0.375rem 0.875rem' }}>
            ⚡ +{result.xp_earned} XP Earned
          </span>
          {result.is_retry && (
            <span className="badge badge-mode" style={{ fontSize: '0.875rem', padding: '0.375rem 0.875rem' }}>
              🔄 Remediation Session
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {hasErrors && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/quizzes/${result.quiz_id}/session`)}
            >
              🔄 Retry Quiz ({incorrectResults.length} Mistakes)
            </button>
          )}
          <Link to="/" className="btn btn-secondary">
            Back to Collections
          </Link>
        </div>
      </div>

      {/* Question by Question Review */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Question Breakdown & Evidence</h2>

        {result.question_results.map((qr, index) => {
          const q = qr.question;
          return (
            <div
              key={q.id || index}
              className="card"
              style={{
                borderLeft: `4px solid ${qr.is_correct ? 'var(--color-success)' : 'var(--color-error)'}`,
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                  Question {index + 1}
                </span>
                <span className={`badge ${qr.is_correct ? 'badge-success' : 'badge-error'}`}>
                  {qr.is_correct ? 'Correct ✓' : 'Incorrect ✗'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.4 }}>
                {q.prompt}
              </h3>

              {/* Options Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {q.options.map(opt => {
                  const isSelected = qr.selected_options.includes(opt.id);
                  const isAnswer = q.correct_answers.includes(opt.id);
                  let stateStyle = {};

                  if (isAnswer) {
                    stateStyle = {
                      background: 'var(--color-success-bg)',
                      borderColor: 'var(--color-success)',
                      fontWeight: 600
                    };
                  } else if (isSelected && !isAnswer) {
                    stateStyle = {
                      background: 'var(--color-error-bg)',
                      borderColor: 'var(--color-error)',
                      fontWeight: 600
                    };
                  }

                  return (
                    <div
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.9rem',
                        ...stateStyle
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{opt.id.toUpperCase()}.</span>
                      <span style={{ flex: 1 }}>{opt.text}</span>
                      {isAnswer && <span style={{ color: 'var(--color-success-dark)', fontWeight: 700, fontSize: '0.75rem' }}>CORRECT ANSWER</span>}
                      {isSelected && !isAnswer && <span style={{ color: 'var(--color-error-dark)', fontWeight: 700, fontSize: '0.75rem' }}>YOUR ANSWER</span>}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Source Citation */}
              <div style={{
                background: 'var(--color-bg)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>

                {q.source_quote && (
                  <div style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    borderLeft: '2px solid var(--color-primary)',
                    paddingLeft: '0.75rem',
                    marginTop: '0.25rem',
                    fontStyle: 'italic'
                  }}>
                    "{q.source_quote}"
                    {q.source_page && <span style={{ fontStyle: 'normal', fontWeight: 600 }}> — Page {q.source_page}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
