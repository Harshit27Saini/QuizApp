import React, { useState } from 'react';
import type { LearningPathGenerateOptions } from '../../types';

interface SandboxSetupModalProps {
  totalPages: number;
  currentDepth: 'sprint' | 'standard' | 'deep_dive';
  onGenerate: (options: LearningPathGenerateOptions) => Promise<void>;
  onClose: () => void;
}

export const SandboxSetupModal: React.FC<SandboxSetupModalProps> = ({
  totalPages,
  currentDepth,
  onGenerate,
  onClose
}) => {
  const [pageStart, setPageStart] = useState<number>(1);
  const [pageEnd, setPageEnd] = useState<number>(Math.min(totalPages, 15));
  const [depth, setDepth] = useState<'sprint' | 'standard' | 'deep_dive'>(currentDepth);
  const [submitting, setSubmitting] = useState(false);
  const [useWholeDoc, setUseWholeDoc] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onGenerate({
        page_start: useWholeDoc ? undefined : pageStart,
        page_end: useWholeDoc ? undefined : pageEnd,
        lesson_depth: depth,
        force_regenerate: true
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate sandbox curriculum');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>⚙️ Learning Sandbox & Scope</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Select specific slides/pages and customize lesson depth.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Scope Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Study Scope
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setUseWholeDoc(true)}
                className={`btn ${useWholeDoc ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.875rem' }}
              >
                📄 Entire Document ({totalPages} pages)
              </button>
              <button
                type="button"
                onClick={() => setUseWholeDoc(false)}
                className={`btn ${!useWholeDoc ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.875rem' }}
              >
                🎯 Custom Slide Range
              </button>
            </div>

            {!useWholeDoc && (
              <div style={{
                background: 'var(--color-bg)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>From Page</label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageStart}
                    onChange={e => setPageStart(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
                <span style={{ marginTop: '1rem', fontWeight: 700 }}>to</span>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>To Page</label>
                  <input
                    type="number"
                    min={pageStart}
                    max={totalPages}
                    value={pageEnd}
                    onChange={e => setPageEnd(Math.min(totalPages, parseInt(e.target.value) || pageStart))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lesson Depth */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Lesson Depth & Pace
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { id: 'sprint', label: '⚡ Quick Sprint', desc: '2–3 core concepts + 2 check questions (~3 min)' },
                { id: 'standard', label: '🎯 Standard Mastery', desc: '3–5 progressive concepts + 3 check questions (~6 min)' },
                { id: 'deep_dive', label: '🔬 Deep Dive', desc: '5–7 in-depth concepts, equations & edge cases (~10 min)' },
              ].map(opt => {
                const isSelected = depth === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setDepth(opt.id as any)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                    </div>
                    <input type="radio" checked={isSelected} readOnly />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Regenerating Sandbox Path...' : '🚀 Apply Scope & Regenerate Path'}
          </button>
        </form>
      </div>
    </div>
  );
};
