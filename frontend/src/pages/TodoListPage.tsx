import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { todoService, type TodoItem } from '../services/todos';
import { xpService } from '../services/xp';
import { companionService } from '../services/companions';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';

export const TodoListPage: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>(todoService.getTodos());
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('pending');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'slides' | 'quiz' | 'reading' | 'review' | 'custom'>('slides');
  const [newXp, setNewXp] = useState<number>(10);
  const [newSlideRange, setNewSlideRange] = useState('');
  const [showAutoChunkModal, setShowAutoChunkModal] = useState(false);
  const [autoDocTitle, setAutoDocTitle] = useState('Lecture Deck');
  const [autoTotalPages, setAutoTotalPages] = useState<number>(129);
  const [xpBalance, setXpBalance] = useState<number>(xpService.getBalance());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCompanion = companionService.getActiveCompanion();

  useEffect(() => {
    const handleXpChanged = () => {
      setXpBalance(xpService.getBalance());
    };
    const handleTodosChanged = () => {
      setTodos(todoService.getTodos());
    };
    window.addEventListener('recall:xp-changed', handleXpChanged);
    window.addEventListener('recall:todos-changed', handleTodosChanged);
    return () => {
      window.removeEventListener('recall:xp-changed', handleXpChanged);
      window.removeEventListener('recall:todos-changed', handleTodosChanged);
    };
  }, []);

  const handleToggle = (id: string) => {
    const { todo, xpEarned } = todoService.toggleTodo(id);
    setTodos(todoService.getTodos());

    if (todo.completed) {
      soundManager.playCorrect();
      triggerConfetti();
      setToastMessage(`🎉 Awesome! Task completed! +${xpEarned} XP added to your wallet!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    todoService.deleteTodo(id);
    setTodos(todoService.getTodos());
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    todoService.addTodo(
      newTitle.trim(),
      newCategory,
      newXp,
      newSlideRange.trim() || undefined
    );
    setTodos(todoService.getTodos());
    setNewTitle('');
    setNewSlideRange('');
    soundManager.playTick();
  };

  const handleAutoChunkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (autoTotalPages <= 0) return;
    todoService.generateTasksFromDocument(autoDocTitle.trim() || 'Slide Deck', autoTotalPages);
    setTodos(todoService.getTodos());
    setShowAutoChunkModal(false);
    soundManager.playVictory();
    triggerConfetti();
    setToastMessage(`✨ Auto-chunked ${autoTotalPages} pages into bite-sized 4-8 slide tasks!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const completedCount = todos.filter(t => t.completed).length;
  const pendingCount = todos.filter(t => !t.completed).length;

  const filteredTodos = todos.filter(t => {
    if (activeTab === 'pending') return !t.completed;
    if (activeTab === 'completed') return t.completed;
    return true;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'slides': return '📑';
      case 'quiz': return '⚡';
      case 'reading': return '📖';
      case 'review': return '🔁';
      default: return '💡';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-blue), var(--color-blue-dark))',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 12px rgba(28, 176, 246, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            border: '2px solid rgba(255, 255, 255, 0.4)'
          }}>
            📝
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>
              Study To-Do & Task Queue
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
              Bite-sized 4–8 slide goals to build daily momentum without cognitive overload.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="badge badge-xp" style={{ fontSize: '0.9rem', padding: '0.5rem 0.875rem' }}>
            ⚡ {xpBalance} Spendable XP
          </div>
          <Link to="/shop" className="btn-3d btn-3d-gold" style={{ fontSize: '0.85rem' }}>
            🛒 Spend in Shop
          </Link>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="card" style={{
          background: 'rgba(88, 204, 2, 0.15)',
          borderLeft: '4px solid var(--color-green)',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '0.9rem' }}>
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cheerleader Motivational Bar */}
      <div className="card" style={{
        padding: '1rem 1.25rem',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '2px solid var(--color-border)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            flexShrink: 0
          }}>
            {companionService.getAvatarUrl(activeCompanion) ? (
              <img
                src={companionService.getAvatarUrl(activeCompanion)}
                alt={activeCompanion.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              activeCompanion.avatarIcon
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              {activeCompanion.name} • Cheerleader
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, fontStyle: 'italic', color: 'var(--color-text-main)' }}>
              "Check off one small 4–8 slide chunk. You don't have to do it all at once!"
            </div>
          </div>
        </div>

        <button
          className="btn-3d btn-3d-white"
          onClick={() => setShowAutoChunkModal(true)}
          style={{ fontSize: '0.85rem' }}
        >
          ✨ Auto-Chunk Slides into Tasks
        </button>
      </div>

      {/* Form: Add New Task */}
      <form onSubmit={handleAdd} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>➕</span>
          <span>Add a New Study Task</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="What micro-task do you want to accomplish? (e.g. Study Slides 1–8 on Latent Conflict)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            required
            style={{
              flex: 2,
              minWidth: '240px',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              fontSize: '0.95rem'
            }}
          />

          <input
            type="text"
            placeholder="Slide range (e.g. Slides 1–8)"
            value={newSlideRange}
            onChange={e => setNewSlideRange(e.target.value)}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              fontSize: '0.9rem'
            }}
          />

          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value as any)}
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              fontSize: '0.9rem',
              fontWeight: 700
            }}
          >
            <option value="slides">📑 Slides (4-8 Chunks)</option>
            <option value="quiz">⚡ Quiz / Checkpoint</option>
            <option value="reading">📖 Deep Reading</option>
            <option value="review">🔁 Spaced Repetition</option>
            <option value="custom">💡 Custom Goal</option>
          </select>

          <select
            value={newXp}
            onChange={e => setNewXp(Number(e.target.value))}
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              fontSize: '0.9rem',
              fontWeight: 700
            }}
          >
            <option value={10}>+10 XP</option>
            <option value={15}>+15 XP</option>
            <option value={20}>+20 XP</option>
            <option value={25}>+25 XP</option>
          </select>

          <button type="submit" className="btn-3d btn-3d-green" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
            Add Task
          </button>
        </div>
      </form>

      {/* Tabs & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('pending')}
            className={`btn-3d ${activeTab === 'pending' ? 'btn-3d-blue' : 'btn-3d-white'}`}
            style={{ fontSize: '0.85rem' }}
          >
            ⏳ Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`btn-3d ${activeTab === 'completed' ? 'btn-3d-green' : 'btn-3d-white'}`}
            style={{ fontSize: '0.85rem' }}
          >
            ✓ Completed ({completedCount})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn-3d ${activeTab === 'all' ? 'btn-3d-blue' : 'btn-3d-white'}`}
            style={{ fontSize: '0.85rem' }}
          >
            All ({todos.length})
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
          Tip: Each task rewards spendable XP for the Cheerleader Shop!
        </div>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredTodos.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h3 style={{ fontWeight: 800 }}>No tasks in this list!</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {activeTab === 'pending'
                ? "You've cleared all your tasks! Enjoy your break or auto-chunk more slides above."
                : "Complete tasks to see them here."}
            </p>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div
              key={todo.id}
              onClick={() => handleToggle(todo.id)}
              className="card"
              style={{
                cursor: 'pointer',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                border: todo.completed
                  ? '2px solid rgba(88, 204, 2, 0.3)'
                  : '2px solid var(--color-border)',
                background: todo.completed
                  ? 'rgba(88, 204, 2, 0.05)'
                  : 'var(--color-surface)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                {/* Checkbox */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: `2px solid ${todo.completed ? 'var(--color-green)' : 'var(--color-border)'}`,
                  background: todo.completed ? 'var(--color-green)' : '#ffffff',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 900,
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}>
                  {todo.completed ? '✓' : ''}
                </div>

                <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                  {getCategoryIcon(todo.category)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: todo.completed ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                    textDecoration: todo.completed ? 'line-through' : 'none'
                  }}>
                    {todo.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {todo.slideRange && (
                      <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(28, 176, 246, 0.1)', color: 'var(--color-blue)', border: '1px solid var(--color-blue)' }}>
                        📑 {todo.slideRange}
                      </span>
                    )}
                    {todo.sourceDocTitle && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        From: {todo.sourceDocTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-xp" style={{ fontSize: '0.75rem' }}>
                  +{todo.xpReward} XP
                </span>
                <button
                  onClick={(e) => handleDelete(todo.id, e)}
                  title="Delete task"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-subtle)',
                    fontSize: '1rem',
                    padding: '0.25rem'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Auto-Chunk Modal */}
      {showAutoChunkModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <form
            onSubmit={handleAutoChunkSubmit}
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✨</span>
                <span>Auto-Chunk Slide Deck</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAutoChunkModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
              Break down a heavy slide deck into manageable 4–8 slide stepping stones. Each chunk earns +15 XP upon completion!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Slide Deck / Document Title
              </label>
              <input
                type="text"
                value={autoDocTitle}
                onChange={e => setAutoDocTitle(e.target.value)}
                required
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Total Slides / Pages
              </label>
              <input
                type="number"
                min={2}
                max={500}
                value={autoTotalPages}
                onChange={e => setAutoTotalPages(Number(e.target.value))}
                required
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  fontSize: '0.9rem'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {Math.round(autoTotalPages / 6)} tasks will be generated (covering 4–8 slides each).
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-3d btn-3d-white"
                onClick={() => setShowAutoChunkModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-3d btn-3d-blue">
                ⚡ Generate Tasks
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
