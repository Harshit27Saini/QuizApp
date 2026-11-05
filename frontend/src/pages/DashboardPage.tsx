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

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const data = await api.listCollections();
      setCollections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    const handleTodos = () => setTodos(todoService.getTodos());
    window.addEventListener('recall:todos-changed', handleTodos);
    return () => window.removeEventListener('recall:todos-changed', handleTodos);
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
      await api.createCollection(title.trim(), description.trim());
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
          {collections.map(c => (
            <Link key={c.id} to={`/collections/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📁</span>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{c.title}</h2>
                  </div>
                  {c.description && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.4 }}>
                      {c.description}
                    </p>
                  )}
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                  <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Open →</span>
                </div>
              </div>
            </Link>
          ))}
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
