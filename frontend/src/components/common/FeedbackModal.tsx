import React, { useState } from 'react';
import { api } from '../../services/api';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'bug' | 'idea' | 'ux'>('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    const feedbackItem = {
      type,
      message: message.trim(),
      url: window.location.pathname,
      browser_info: navigator.userAgent
    };

    try {
      // 1. Submit directly to backend database
      await api.submitFeedback(feedbackItem);
    } catch {
      // 2. Fall back to local storage if offline
      try {
        const existing = JSON.parse(localStorage.getItem('recall_playtester_feedback') || '[]');
        localStorage.setItem('recall_playtester_feedback', JSON.stringify([{ ...feedbackItem, id: 'fb_' + Date.now(), timestamp: new Date().toISOString() }, ...existing]));
      } catch {}
    } finally {
      setSubmitting(false);
    }

    soundManager.playVictory();
    triggerConfetti();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      onClose();
    }, 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(3px)'
    }}>
      <div className="card" style={{
        maxWidth: '460px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
      }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900 }}>Feedback Saved!</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Thank you for playtesting Recall! Your report helps make the app bug-free.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🐞</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Playtest Bug / Feedback</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Found an issue or have an idea? Let us know and we'll fix it right away!
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`btn-3d ${type === 'bug' ? 'btn-3d-red' : 'btn-3d-white'}`}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                🐛 Bug Found
              </button>
              <button
                type="button"
                onClick={() => setType('idea')}
                className={`btn-3d ${type === 'idea' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                💡 Feature Idea
              </button>
              <button
                type="button"
                onClick={() => setType('ux')}
                className={`btn-3d ${type === 'ux' ? 'btn-3d-green' : 'btn-3d-white'}`}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                ✨ Feedback
              </button>
            </div>

            <textarea
              rows={4}
              required
              placeholder={type === 'bug' ? 'Describe the bug: what happened vs what was expected?' : 'Share your idea or suggestion...'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-3d btn-3d-white"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-3d btn-3d-green"
              >
                {submitting ? 'Submitting...' : '🚀 Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

