import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { StudyDocument } from '../types';

export const QuizSetupPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [searchParams] = useSearchParams();
  const preselectedDocId = searchParams.get('doc');
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'EXAMINATION' | 'STRICT' | 'CONCEPTUAL'>('EXAMINATION');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) return;
    setLoading(true);
    api.listDocuments(collectionId)
      .then(docs => {
        setDocuments(docs);
        if (preselectedDocId && docs.some(d => d.id === preselectedDocId)) {
          setSelectedDocIds([preselectedDocId]);
        } else if (docs.length > 0) {
          setSelectedDocIds([docs[0].id]);
        }
      })
      .catch(err => setError(err.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, [collectionId, preselectedDocId]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id)
        ? (prev.length > 1 ? prev.filter(item => item !== id) : prev)
        : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocIds.length === 0) {
      alert('Please select at least one document.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const quiz = await api.generateQuiz({
        collection_id: collectionId,
        document_ids: selectedDocIds,
        mode,
        difficulty,
        question_count: Math.max(1, Math.min(25, questionCount)),
        question_types: ['MCQ', 'MSQ']
      });
      navigate(`/quizzes/${quiz.id}/session`);
    } catch (err: any) {
      setError(err.message || 'Quiz generation failed');
      setGenerating(false);
    }
  };

  const PRESET_COUNTS = [3, 5, 10, 15, 20];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <Link to={`/collections/${collectionId}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
          ← Back to Collection
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>Configure Quiz</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem' }}>
          Customize your active-recall assessment parameters.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading document options...
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Target Documents */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Select Source Material ({selectedDocIds.length} selected)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {documents.map(d => {
                const isSelected = selectedDocIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDocSelection(d.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{d.filename}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                        ({d.total_pages} {d.total_pages === 1 ? 'page' : 'pages'})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generation Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Exam Pattern & Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div
                onClick={() => setMode('EXAMINATION')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${mode === 'EXAMINATION' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: mode === 'EXAMINATION' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.925rem', marginBottom: '0.25rem', color: mode === 'EXAMINATION' ? 'var(--color-primary)' : 'inherit' }}>
                  🎯 EXAMINATION (Recommended)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Realistic university exam questions: tests mechanisms, causality, and plausible academic distractors without reading-trivia.
                </div>
              </div>

              <div
                onClick={() => setMode('STRICT')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${mode === 'STRICT' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: mode === 'STRICT' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.925rem', marginBottom: '0.25rem' }}>📌 STRICT FACTUAL</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Rigorous direct recall with mandatory evidence quotes directly cited from the text.
                </div>
              </div>

              <div
                onClick={() => setMode('CONCEPTUAL')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${mode === 'CONCEPTUAL' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: mode === 'CONCEPTUAL' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.925rem', marginBottom: '0.25rem' }}>💡 CONCEPTUAL</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Comprehension of fundamental principles, analogies, and cross-concept interactions.
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty & Granular Question Count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Difficulty
              </label>
              <select
                className="select-input"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
              >
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="hard">Hard (Advanced Rigor)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Question Count: <strong>{questionCount}</strong>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={questionCount}
                  onChange={e => setQuestionCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
                  className="input-text"
                  style={{ width: '80px', fontWeight: 700, textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  (~{questionCount * 1} min)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
              Quick Presets
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PRESET_COUNTS.map(preset => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setQuestionCount(preset)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    border: `1.5px solid ${questionCount === preset ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: questionCount === preset ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: questionCount === preset ? 'var(--color-primary)' : 'var(--color-text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {preset} Qs
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
            disabled={generating}
          >
            {generating ? 'Synthesizing grounded questions...' : `⚡ Launch Quiz Session (${questionCount} Questions)`}
          </button>
        </form>
      )}
    </div>
  );
};
