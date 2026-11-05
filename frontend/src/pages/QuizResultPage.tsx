import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { questService } from '../services/quests';
import { xpService } from '../services/xp';
import type { AttemptResult } from '../types';

export const QuizResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const examState = location.state as {
    isExamMode?: boolean;
    negativeMarking?: number;
    timeLimitMinutes?: number;
    timeTakenSeconds?: number;
  } | undefined;

  const isExamMode = examState?.isExamMode ?? false;
  const negativeMarking = examState?.negativeMarking ?? 0;

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    api.getAttemptResult(attemptId)
      .then(res => {
        setResult(res);
        questService.recordQuizScore(res.score);
        const earnedXp = Math.max(10, Math.round(res.score * 0.5));
        xpService.awardXp(earnedXp, `Quiz Attempt Completed (${res.score}%)`);
        if (res.score >= 70) {
          soundManager.playVictory();
          triggerConfetti();
        } else {
          soundManager.playWrong();
        }
      })
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
  const incorrectCount = result.total_questions - result.correct_count;
  const penaltyDeduction = Number((incorrectCount * negativeMarking).toFixed(2));
  const netScore = Math.max(0, Number((result.correct_count - penaltyDeduction).toFixed(2)));
  const netPercentage = Math.round((netScore / result.total_questions) * 100);
  const isPassed = isExamMode ? netPercentage >= 70 : result.score >= 70;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Official Exam Mode Scorecard */}
      {isExamMode ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: 'var(--color-surface)',
          border: `3px solid ${isPassed ? 'var(--color-green)' : 'var(--color-gold)'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: 'var(--color-blue)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
            🏛️ Official Examination Scorecard
          </div>

          <div style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            color: isPassed ? 'var(--color-green)' : 'var(--color-gold-dark)',
            lineHeight: 1
          }}>
            {netScore} / {result.total_questions}
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isPassed ? 'var(--color-green)' : 'var(--color-gold-dark)', marginTop: '0.5rem' }}>
            {isPassed ? 'PASSED 🎓 (Benchmark: 70%)' : 'NEEDS REMEDIATION ⚠️ (Benchmark: 70%)'}
          </div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Time Taken: {result.time_taken_seconds}s • Average pace: {(result.time_taken_seconds / result.total_questions).toFixed(1)}s / question
          </p>

          {/* Exam Marks Breakdown Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.5rem',
            background: 'var(--color-bg)',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Correct (+1.0)</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-green)' }}>
                +{result.correct_count}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Incorrect</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-error)' }}>
                {incorrectCount}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Penalty Deducted</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-error)' }}>
                -{penaltyDeduction}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Net Accuracy</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-blue)' }}>
                {netPercentage}%
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {hasErrors && (
              <button
                className="btn-3d btn-3d-blue"
                onClick={() => navigate(`/quizzes/${result.quiz_id}/session`)}
              >
                🔄 Retry Exam
              </button>
            )}
            <Link to="/" className="btn-3d btn-3d-white">
              Back to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* Standard Score Summary Header */
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
                className="btn-3d btn-3d-blue"
                onClick={() => navigate(`/quizzes/${result.quiz_id}/session`)}
              >
                🔄 Retry Quiz ({incorrectResults.length} Mistakes)
              </button>
            )}
            <Link to="/" className="btn-3d btn-3d-white">
              Back to Collections
            </Link>
          </div>
        </div>
      )}

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
                  {qr.is_correct ? 'Correct ✓' : 'Incorrect ✕'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.4, marginBottom: '1rem' }}>
                {q.prompt}
              </h3>

              {/* Options feedback */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {q.options.map(opt => {
                  const isCorrectAnswer = q.correct_answers.includes(opt.id);
                  const isUserSelection = qr.selected_options.includes(opt.id);

                  let itemClass = '';
                  let statusBadge = null;

                  if (isCorrectAnswer) {
                    itemClass = 'selected';
                    statusBadge = <span style={{ color: 'var(--color-success-dark)', fontWeight: 700, fontSize: '0.75rem', marginLeft: 'auto' }}>Correct Answer ✓</span>;
                  } else if (isUserSelection && !isCorrectAnswer) {
                    itemClass = 'selected';
                    statusBadge = <span style={{ color: 'var(--color-error-dark)', fontWeight: 700, fontSize: '0.75rem', marginLeft: 'auto' }}>Your Incorrect Choice ✕</span>;
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`quiz-option ${itemClass}`}
                      style={{
                        cursor: 'default',
                        borderColor: isCorrectAnswer ? 'var(--color-success)' : (isUserSelection ? 'var(--color-error)' : 'var(--color-border)')
                      }}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-sm)',
                        background: isCorrectAnswer ? 'var(--color-success)' : (isUserSelection ? 'var(--color-error)' : 'var(--color-surface-hover)'),
                        color: (isCorrectAnswer || isUserSelection) ? '#fff' : 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}>
                        {opt.id.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.9rem' }}>{opt.text}</div>
                      {statusBadge}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Source Citation */}
              <div style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Explanation & Evidence
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                  {q.explanation}
                </p>

                {q.source_quote && (
                  <div style={{
                    fontSize: '0.825rem',
                    color: 'var(--color-text-muted)',
                    fontStyle: 'italic',
                    borderLeft: '2px solid var(--color-primary)',
                    paddingLeft: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    "{q.source_quote}"
                    {q.source_page && <span> — Page {q.source_page}</span>}
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
