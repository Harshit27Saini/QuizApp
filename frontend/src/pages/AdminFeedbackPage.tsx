import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';

export const AdminFeedbackPage: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bug' | 'idea' | 'ux'>('all');

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const res = await api.listFeedback();
      if (res && res.length > 0) {
        setFeedbackList(res);
      } else {
        // Check local storage fallback
        const local = JSON.parse(localStorage.getItem('recall_playtester_feedback') || '[]');
        setFeedbackList(local);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem('recall_playtester_feedback') || '[]');
      setFeedbackList(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFeedback(id);
    } catch {
      const local = JSON.parse(localStorage.getItem('recall_playtester_feedback') || '[]');
      const filtered = local.filter((item: any) => item.id !== id);
      localStorage.setItem('recall_playtester_feedback', JSON.stringify(filtered));
    }
    soundManager.playCorrect();
    setFeedbackList(prev => prev.filter(item => item.id !== id));
  };

  const filtered = feedbackList.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>👑</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ background: 'var(--color-gold)', color: '#000', fontWeight: 900, fontSize: '0.7rem' }}>
                FOUNDER PORTAL
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {feedbackList.length} Total Reports Received
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.2rem 0 0 0' }}>
              Playtester Bug Inbox & Feedback
            </h1>
          </div>
        </div>

        <button
          onClick={loadFeedback}
          className="btn-3d btn-3d-white"
          style={{ fontSize: '0.85rem' }}
        >
          🔄 Refresh Inbox
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setFilter('all')}
          className={`btn-3d ${filter === 'all' ? 'btn-3d-blue' : 'btn-3d-white'}`}
          style={{ fontSize: '0.85rem' }}
        >
          All ({feedbackList.length})
        </button>
        <button
          onClick={() => setFilter('bug')}
          className={`btn-3d ${filter === 'bug' ? 'btn-3d-red' : 'btn-3d-white'}`}
          style={{ fontSize: '0.85rem' }}
        >
          🐛 Bugs ({feedbackList.filter(f => f.type === 'bug').length})
        </button>
        <button
          onClick={() => setFilter('idea')}
          className={`btn-3d ${filter === 'idea' ? 'btn-3d-gold' : 'btn-3d-white'}`}
          style={{ fontSize: '0.85rem' }}
        >
          💡 Ideas ({feedbackList.filter(f => f.type === 'idea').length})
        </button>
        <button
          onClick={() => setFilter('ux')}
          className={`btn-3d ${filter === 'ux' ? 'btn-3d-green' : 'btn-3d-white'}`}
          style={{ fontSize: '0.85rem' }}
        >
          ✨ UX ({feedbackList.filter(f => f.type === 'ux').length})
        </button>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading playtest bug reports...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📬</div>
          <h3 style={{ fontWeight: 800 }}>No bug reports in this category!</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            When your playtesters click the 🐞 Bug button, their reports will appear here in real time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(item => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderLeft: `5px solid ${item.type === 'bug' ? 'var(--color-red)' : item.type === 'idea' ? 'var(--color-gold)' : 'var(--color-green)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span className="badge" style={{
                    background: item.type === 'bug' ? 'rgba(255, 75, 75, 0.15)' : item.type === 'idea' ? 'rgba(255, 200, 0, 0.15)' : 'rgba(88, 204, 2, 0.15)',
                    color: item.type === 'bug' ? 'var(--color-red)' : item.type === 'idea' ? 'var(--color-gold-dark)' : 'var(--color-green-dark)',
                    border: `1px solid ${item.type === 'bug' ? 'var(--color-red)' : item.type === 'idea' ? 'var(--color-gold)' : 'var(--color-green)'}`,
                    fontSize: '0.75rem'
                  }}>
                    {item.type === 'bug' ? '🐛 BUG' : item.type === 'idea' ? '💡 IDEA' : '✨ UX'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                    From: {item.display_name || item.email || 'Tester'} ({item.email || 'playtest'})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn-3d btn-3d-white"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    title="Mark resolved & remove"
                  >
                    ✓ Resolve
                  </button>
                </div>
              </div>

              <div style={{
                background: 'var(--color-bg)',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.925rem',
                color: 'var(--color-text-main)',
                lineHeight: 1.5,
                border: '1px solid var(--color-border)'
              }}>
                {item.message}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>Route: <code>{item.url}</code></span>
                {item.browser_info && <span>Client: {item.browser_info.slice(0, 40)}...</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
