import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';

export const AdminFeedbackPage: React.FC = () => {
  // Authentication & Developer Gate State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const user = JSON.parse(localStorage.getItem('recall_user_profile') || 'null');
      const passcode = localStorage.getItem('recall_founder_passcode');
      return Boolean(
        user?.is_admin ||
        user?.email?.toLowerCase().includes('harshit') ||
        user?.email?.toLowerCase().includes('dev@recall.local') ||
        passcode === 'recall-founder-2026'
      );
    } catch {
      return false;
    }
  });

  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Tab State: 'feedback' | 'telemetry'
  const [activeTab, setActiveTab] = useState<'feedback' | 'telemetry'>('feedback');

  // Bug Reports State
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'bug' | 'idea' | 'ux'>('all');

  // Telemetry & Activity Logs State
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Load Bug Feedback
  const loadFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const res = await api.listFeedback();
      if (res && res.length >= 0) {
        setFeedbackList(res);
      } else {
        const local = JSON.parse(localStorage.getItem('recall_playtester_feedback') || '[]');
        setFeedbackList(local);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem('recall_playtester_feedback') || '[]');
      setFeedbackList(local);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Load Telemetry Activity Logs
  const loadTelemetry = async () => {
    try {
      setLoadingTelemetry(true);
      const res = await api.listTelemetryLogs({ limit: 300 });
      setTelemetryLogs(res || []);
    } catch {
      setTelemetryLogs([]);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadFeedback();
      loadTelemetry();
    }
  }, [isAdmin]);

  const handleClaimFounder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeAttempt.trim()) return;

    try {
      setIsUnlocking(true);
      setPasscodeError('');
      const res = await api.claimFounder(passcodeAttempt.trim());
      if (res && res.is_admin) {
        localStorage.setItem('recall_founder_passcode', passcodeAttempt.trim());
        localStorage.setItem('recall_auth_token', res.token);
        localStorage.setItem('recall_user_profile', JSON.stringify(res.user));
        window.dispatchEvent(new CustomEvent('recall:auth-changed', { detail: res.user }));
        setIsAdmin(true);
        soundManager.playVictory();
      } else {
        setPasscodeError('Invalid founder passcode.');
      }
    } catch (err: any) {
      setPasscodeError(err.message || 'Incorrect founder passcode.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
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

  const handleClearTelemetry = async () => {
    if (window.confirm('Purge all stored telemetry and activity logs?')) {
      try {
        await api.clearTelemetryLogs();
        setTelemetryLogs([]);
        soundManager.playCorrect();
      } catch {
        alert('Failed to clear logs.');
      }
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(telemetryLogs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `recall_telemetry_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  // ---------------------------------------------------------------------------
  // Gated Screen for Non-Developer Visitors
  // ---------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '3rem auto',
        padding: '2rem',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
        <span className="badge badge-error" style={{ marginBottom: '1rem' }}>
          RESTRICTED ACCESS
        </span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          Developer Hub Gate
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          This triage portal and activity diagnostic monitor is strictly restricted to Harshit (Developer & Founder).
        </p>

        <form onSubmit={handleClaimFounder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            placeholder="Enter Founder Passcode"
            value={passcodeAttempt}
            onChange={e => setPasscodeAttempt(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-main)',
              fontSize: '1rem',
              fontWeight: 700,
              textAlign: 'center'
            }}
          />

          {passcodeError && (
            <div style={{ color: 'var(--color-red)', fontSize: '0.85rem', fontWeight: 800 }}>
              {passcodeError}
            </div>
          )}

          <button
            type="submit"
            disabled={isUnlocking}
            className="btn-3d btn-3d-green"
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.95rem' }}
          >
            {isUnlocking ? 'Verifying...' : '⚡ Unlock Developer Hub'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <a
            href="/"
            style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)', fontWeight: 800, textDecoration: 'none' }}
          >
            ← Return to Study Mode
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Filtered Lists & Metrics
  // ---------------------------------------------------------------------------
  const filteredFeedback = feedbackList.filter(item => {
    if (feedbackFilter === 'all') return true;
    return item.type === feedbackFilter;
  });

  const uniqueUsers = Array.from(new Set(telemetryLogs.map(l => l.user_email || l.user_id || 'anonymous')));
  const totalErrors = telemetryLogs.filter(l => l.event_type?.includes('ERROR')).length;

  const filteredLogs = telemetryLogs.filter(l => {
    if (userFilter !== 'all') {
      const match = (l.user_email === userFilter) || (l.user_id === userFilter);
      if (!match) return false;
    }
    if (eventTypeFilter === 'error_only') {
      return l.event_type?.includes('ERROR');
    }
    if (eventTypeFilter !== 'all') {
      return l.event_type === eventTypeFilter;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem 1.75rem',
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
                FOUNDER ONLY
              </span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Harshit Dev Portal • Recall Production
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0.2rem 0 0 0', color: '#fff' }}>
              Developer Diagnostics & Triage Hub
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              loadFeedback();
              loadTelemetry();
            }}
            className="btn-3d btn-3d-white"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            🔄 Refresh Live
          </button>
        </div>
      </div>

      {/* Primary Section Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--color-border)',
        gap: '0.5rem',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`btn-3d ${activeTab === 'feedback' ? 'btn-3d-blue' : 'btn-3d-white'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          🐞 Bug Reports ({feedbackList.length})
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`btn-3d ${activeTab === 'telemetry' ? 'btn-3d-blue' : 'btn-3d-white'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          📊 Live User Activity & Logs ({telemetryLogs.length})
        </button>
      </div>

      {/* =======================================================================
          TAB 1: PLAYTESTER BUG REPORTS
          ======================================================================= */}
      {activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Sub Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFeedbackFilter('all')}
              className={`btn-3d ${feedbackFilter === 'all' ? 'btn-3d-blue' : 'btn-3d-white'}`}
              style={{ fontSize: '0.8rem' }}
            >
              All ({feedbackList.length})
            </button>
            <button
              onClick={() => setFeedbackFilter('bug')}
              className={`btn-3d ${feedbackFilter === 'bug' ? 'btn-3d-red' : 'btn-3d-white'}`}
              style={{ fontSize: '0.8rem' }}
            >
              🐛 Bugs ({feedbackList.filter(f => f.type === 'bug').length})
            </button>
            <button
              onClick={() => setFeedbackFilter('idea')}
              className={`btn-3d ${feedbackFilter === 'idea' ? 'btn-3d-gold' : 'btn-3d-white'}`}
              style={{ fontSize: '0.8rem' }}
            >
              💡 Ideas ({feedbackList.filter(f => f.type === 'idea').length})
            </button>
            <button
              onClick={() => setFeedbackFilter('ux')}
              className={`btn-3d ${feedbackFilter === 'ux' ? 'btn-3d-green' : 'btn-3d-white'}`}
              style={{ fontSize: '0.8rem' }}
            >
              ✨ UX ({feedbackList.filter(f => f.type === 'ux').length})
            </button>
          </div>

          {/* List */}
          {loadingFeedback ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              Loading playtest bug reports...
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📬</div>
              <h3 style={{ fontWeight: 800 }}>No bug reports in this category!</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                When your playtesters click the 🐞 Bug button, their reports will appear here in real time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredFeedback.map(item => (
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
                        onClick={() => handleDeleteFeedback(item.id)}
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>Route: <code>{item.url}</code></span>
                    {item.browser_info && <span>Client: {item.browser_info.slice(0, 45)}...</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 2: PLAYTESTER ACTIVITY & TELEMETRY LOGS
          ======================================================================= */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Diagnostic KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                👥 Active Testers
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-blue)', marginTop: '0.25rem' }}>
                {uniqueUsers.length}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                ⚡ Total Events Logged
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-green)', marginTop: '0.25rem' }}>
                {telemetryLogs.length}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                🚨 Client Exceptions
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: totalErrors > 0 ? 'var(--color-red)' : 'var(--color-text-subtle)', marginTop: '0.25rem' }}>
                {totalErrors}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleExportJson}
                className="btn-3d btn-3d-white"
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              >
                📥 Export JSON
              </button>
              <button
                onClick={handleClearTelemetry}
                className="btn-3d btn-3d-white"
                style={{ fontSize: '0.8rem', padding: '0.4rem', color: 'var(--color-red)' }}
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'var(--color-surface)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
              Filter By:
            </span>

            {/* User Dropdown Filter */}
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              <option value="all">All Playtesters ({uniqueUsers.length})</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {/* Event Type Filter */}
            <select
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              <option value="all">All Event Types</option>
              <option value="error_only">🚨 Errors Only ({totalErrors})</option>
              <option value="PAGE_VIEW">🗺️ Page Views</option>
              <option value="SESSION_START">⚡ Session Starts</option>
              <option value="QUIZ_START">🎯 Quiz Starts</option>
              <option value="QUIZ_FINISH">🏆 Quiz Finishes</option>
              <option value="SCALE_CHANGE">🔍 UI Scale Changes</option>
            </select>

            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Showing {filteredLogs.length} of {telemetryLogs.length} events
            </span>
          </div>

          {/* Activity Logs Timeline */}
          {loadingTelemetry ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              Loading playtester activity logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
              <h3 style={{ fontWeight: 800 }}>No telemetry events recorded yet!</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                As playtesters navigate routes, trigger quizzes, or experience issues, their real-time telemetry will stream here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredLogs.map(log => {
                const isError = log.event_type?.includes('ERROR');
                const isQuiz = log.event_type?.includes('QUIZ');
                const isScale = log.event_type?.includes('SCALE');

                return (
                  <div
                    key={log.id}
                    className="card"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      borderLeft: `5px solid ${isError ? 'var(--color-red)' : isQuiz ? 'var(--color-green)' : isScale ? 'var(--color-purple)' : 'var(--color-blue)'}`,
                      background: isError ? 'rgba(255, 75, 75, 0.03)' : 'var(--color-surface)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge" style={{
                          background: isError ? 'rgba(255, 75, 75, 0.15)' : isQuiz ? 'rgba(88, 204, 2, 0.15)' : 'rgba(28, 176, 246, 0.15)',
                          color: isError ? 'var(--color-red)' : isQuiz ? 'var(--color-green-dark)' : 'var(--color-blue)',
                          border: `1px solid ${isError ? 'var(--color-red)' : isQuiz ? 'var(--color-green)' : 'var(--color-blue)'}`,
                          fontSize: '0.725rem',
                          fontWeight: 900
                        }}>
                          {log.event_type}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                          👤 {log.user_email || log.user_name || log.user_id}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                          • Route: <code>{log.path || '/'}</code>
                        </span>
                      </div>

                      <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() + ' (' + new Date(log.created_at).toLocaleDateString() + ')' : 'Recent'}
                      </div>
                    </div>

                    {/* Payload Details */}
                    {log.payload && Object.keys(log.payload).length > 0 && (
                      <div style={{
                        background: 'var(--color-bg)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: isError ? 'var(--color-red)' : 'var(--color-text-main)',
                        border: '1px solid var(--color-border)',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {JSON.stringify(log.payload, null, 2)}
                      </div>
                    )}

                    {/* Device & Client Diagnostics */}
                    {log.device_info && Object.keys(log.device_info).length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        fontSize: '0.7rem',
                        color: 'var(--color-text-subtle)',
                        flexWrap: 'wrap'
                      }}>
                        {log.device_info.screen && <span>📱 Screen: {log.device_info.screen}</span>}
                        {log.device_info.ui_scale && <span>🔍 Scale: {log.device_info.ui_scale}</span>}
                        {log.device_info.userAgent && <span>🌐 Agent: {log.device_info.userAgent.slice(0, 50)}...</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
