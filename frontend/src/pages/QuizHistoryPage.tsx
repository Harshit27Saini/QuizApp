import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { AttemptResult } from '../types';

export const QuizHistoryPage: React.FC = () => {
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.listAttempts()
      .then(data => setAttempts(data))
      .catch(err => setError(err.message || 'Failed to load attempt history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Learning History & Progress</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem' }}>
          Track past quiz attempts, review mistake patterns, and reinforce active recall.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading your learning records...
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏱️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No quizzes completed yet</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            Complete your first quiz session to track performance and review detailed answer citations.
          </p>
          <Link to="/" className="btn btn-primary">
            Start Learning
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {attempts.map(att => (
            <div
              key={att.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-full)',
                  background: att.score >= 70 ? 'var(--color-success-bg)' : 'var(--color-xp-bg)',
                  color: att.score >= 70 ? 'var(--color-success-dark)' : 'var(--color-xp-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: `2px solid ${att.score >= 70 ? 'var(--color-success-border)' : '#fde68a'}`
                }}>
                  {Math.round(att.score)}%
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Attempt on {new Date(att.started_at).toLocaleDateString()}
                    </h3>
                    {att.is_retry && (
                      <span className="badge badge-mode">Retry Session</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {att.correct_count} of {att.total_questions} correct • {att.time_taken_seconds} seconds
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  to={`/attempts/${att.id}/result`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  View Details →
                </Link>
                <Link
                  to={`/quizzes/${att.quiz_id}/session`}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Retake Quiz
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
