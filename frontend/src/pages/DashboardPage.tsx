import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { todoService, type TodoItem } from '../services/todos';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import type { Collection } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>(todoService.getTodos());

  // New collection modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragTargetCardId, setDragTargetCardId] = useState<string | null>(null);
  const [cardUploading, setCardUploading] = useState<string | null>(null);

  const handleCardDrop = async (collectionId: string, files: FileList | null, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTargetCardId(null);
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ['.pdf', '.docx', '.pptx', '.txt'].includes(ext);
    });

    if (validFiles.length === 0) {
      alert("Please drop supported document files (.pdf, .docx, .pptx, or .txt).");
      return;
    }

    try {
      setCardUploading(collectionId);
      for (const f of validFiles) {
        await api.uploadDocument(collectionId, f);
        soundManager.playCorrect();
      }
      soundManager.playVictory();
      triggerConfetti();
      navigate(`/collections/${collectionId}`);
    } catch (err: any) {
      alert(`Upload failed: ${err?.message || 'Server error'}`);
    } finally {
      setCardUploading(null);
    }
  };

  const getCollectionsCacheKey = () => {
    try {
      const profileStr = localStorage.getItem('recall_user_profile');
      if (profileStr) {
        const p = JSON.parse(profileStr);
        if (p?.id) return `recall_cached_collections_${p.id}`;
      }
    } catch {}
    const guestId = localStorage.getItem('recall_guest_id') || 'guest';
    return `recall_cached_collections_${guestId}`;
  };

  const fetchCollections = async () => {
    const cacheKey = getCollectionsCacheKey();
    try {
      setLoading(true);
      const data = await api.listCollections();
      const list = Array.isArray(data) ? data : [];
      setCollections(list);
      localStorage.setItem(cacheKey, JSON.stringify(list));
      setError(null);
    } catch (err: any) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setCollections(JSON.parse(cached));
        } catch {
          setError(err.message || 'Failed to load collections');
        }
      } else {
        setError(err.message || 'Failed to load collections');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    const handleTodos = () => setTodos(todoService.getTodos());
    const handleAuth = () => fetchCollections();
    window.addEventListener('recall:todos-changed', handleTodos);
    window.addEventListener('recall:auth-changed', handleAuth);
    return () => {
      window.removeEventListener('recall:todos-changed', handleTodos);
      window.removeEventListener('recall:auth-changed', handleAuth);
    };
  }, []);

  const handleToggleTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { todo } = todoService.toggleTodo(id);
    setTodos(todoService.getTodos());
    if (todo.completed) {
      soundManager.playCorrect();
      triggerConfetti();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const created = await api.createCollection(title.trim(), description.trim());
      if (created?.id) {
        localStorage.setItem(`recall_coll_title_${created.id}`, created.title);
        const cacheKey = getCollectionsCacheKey();
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        localStorage.setItem(cacheKey, JSON.stringify([created, ...cached.filter((c: any) => c.id !== created.id)]));
      }
      setTitle('');
      setDescription('');
      setShowModal(false);
      fetchCollections();
    } catch (err: any) {
      alert(err.message || 'Failed to create collection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCollection = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the collection "${title}" and all its documents?`)) {
      try {
        await api.deleteCollection(id);
        const cacheKey = getCollectionsCacheKey();
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        localStorage.setItem(cacheKey, JSON.stringify(cached.filter((c: any) => c.id !== id)));
        soundManager.playCorrect();
        fetchCollections();
      } catch (err: any) {
        alert(err.message || 'Failed to delete collection');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-text-main)' }}>Study Collections</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Organize your course materials, lecture notes, and reading packets.
          </p>
        </div>
        <button className="btn-3d btn-3d-green" onClick={() => setShowModal(true)}>
          + New Collection
        </button>
      </div>

      {/* Just Start Mode Banner (ADHD / Low-Activation Energy) */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(230, 83, 243, 0.12) 0%, rgba(28, 176, 246, 0.1) 100%)',
        border: '2px solid rgba(206, 130, 255, 0.35)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderRadius: 'var(--radius-xl)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🛋️</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>Feeling Overwhelmed or Stuck?</h2>
              <span className="badge" style={{ background: '#ce82ff', color: '#fff', fontSize: '0.65rem' }}>JUST START MODE</span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              No overwhelming lists. We pick <strong>one tiny micro-task</strong> and start a peaceful <strong>5-minute timer</strong>. Stop whenever you want.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/just-start')}
          className="btn-3d btn-3d-purple"
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
        >
          🥱 "I don't feel like studying"
        </button>
      </div>

      {/* Mini Study To-Do & Momentum Card */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📝</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>Today's Study Checklist</h2>
            <span className="badge badge-xp" style={{ fontSize: '0.7rem' }}>+XP REWARDS</span>
          </div>
          <Link to="/todos" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-blue)' }}>
            Full Queue ({todos.filter(t => !t.completed).length} pending) →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {todos.slice(0, 3).map(todo => (
            <div
              key={todo.id}
              onClick={(e) => handleToggleTodo(todo.id, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                background: todo.completed ? 'rgba(88, 204, 2, 0.08)' : 'var(--color-bg)',
                border: `1.5px solid ${todo.completed ? 'var(--color-green)' : 'var(--color-border)'}`,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  border: `2px solid ${todo.completed ? 'var(--color-green)' : 'var(--color-border)'}`,
                  background: todo.completed ? 'var(--color-green)' : '#ffffff',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 900
                }}>
                  {todo.completed ? '✓' : ''}
                </div>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: todo.completed ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                  textDecoration: todo.completed ? 'line-through' : 'none'
                }}>
                  {todo.title}
                </span>
              </div>
              <span className="badge badge-xp" style={{ fontSize: '0.7rem' }}>
                +{todo.xpReward} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading your collections...
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No study collections yet</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Create your first collection to upload documents, review extracted sections, and generate active-recall quizzes.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Your First Collection
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}>
          {collections.map(c => {
            const isTarget = dragTargetCardId === c.id;
            const isUploadingThis = cardUploading === c.id;

            return (
              <div
                key={c.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                  if (dragTargetCardId !== c.id) setDragTargetCardId(c.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragTargetCardId === c.id) setDragTargetCardId(null);
                }}
                onDrop={(e) => handleCardDrop(c.id, e.dataTransfer.files, e)}
                style={{ height: '100%' }}
              >
                <Link to={`/collections/${c.id}`} style={{ textDecoration: 'none', height: '100%', display: 'block' }}>
                  <div
                    className="card"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: isTarget ? '2.5px dashed var(--color-green)' : '2px solid var(--color-border)',
                      background: isTarget ? 'rgba(88, 204, 2, 0.08)' : 'var(--color-surface)',
                      boxShadow: isTarget ? '0 12px 30px rgba(88, 204, 2, 0.2)' : 'none',
                      transform: isTarget ? 'scale(1.02)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{isTarget ? '📥' : '📁'}</span>
                          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{c.title}</h2>
                        </div>
                        <button
                          onClick={(e) => handleDeleteCollection(c.id, c.title, e)}
                          className="btn-3d btn-3d-white"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--color-error)' }}
                          title="Delete Collection"
                        >
                          🗑️
                        </button>
                      </div>
                      {c.description && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.4 }}>
                          {c.description}
                        </p>
                      )}
                      {isTarget && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem',
                          background: 'rgba(88, 204, 2, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: 'var(--color-green)',
                          textAlign: 'center'
                        }}>
                          Drop file here to upload!
                        </div>
                      )}
                      {isUploadingThis && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem',
                          background: 'rgba(28, 176, 246, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: 'var(--color-blue)',
                          textAlign: 'center'
                        }}>
                          Uploading & analyzing document...
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                      <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Open →</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* New Collection Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Create Study Collection</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Group your syllabus or subject notes together.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Collection Title *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Cognitive Psychology, Cell Biology"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Description (Optional)
                </label>
                <textarea
                  className="textarea-input"
                  rows={3}
                  placeholder="Briefly describe the topics covered..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-3d btn-3d-white"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-3d btn-3d-green"
                  disabled={submitting || !title.trim()}
                >
                  {submitting ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
