import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi, type Group } from '../services/battles';

const EMOJI_OPTIONS = ['🔥', '⚡', '🧠', '📚', '🎯', '🏆', '💡', '🌊'];

const CreateGroupForm: React.FC<{ onCreated: (g: Group) => void; onCancel: () => void }> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const group = await groupsApi.createGroup(name.trim(), emoji);
      onCreated(group);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--color-blue)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-blue-dark)' }}>✨ Create New Group</div>
      {error && (
        <div style={{ background: 'var(--color-red-light)', border: '1.5px solid var(--color-red)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.875rem', fontSize: '0.85rem', color: 'var(--color-red-dark)', fontWeight: 700 }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="Group name..."
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', fontSize: '0.95rem', fontWeight: 700 }}
        />
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-subtle)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pick Emoji</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: '44px', height: '44px', borderRadius: 'var(--radius-md)', fontSize: '1.5rem',
                  border: `2px solid ${emoji === e ? 'var(--color-blue)' : 'var(--color-border)'}`,
                  background: emoji === e ? 'var(--color-blue-light)' : 'var(--color-surface-hover)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button type="submit" className="btn-3d btn-3d-green" disabled={loading || !name.trim()}>
            {loading ? '⏳ Creating...' : '➕ Create'}
          </button>
          <button type="button" className="btn-3d btn-3d-white" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

const GroupCard: React.FC<{ group: Group; onOpen: (id: string) => void }> = ({ group, onOpen }) => (
  <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-hover)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>
        {group.emoji}
      </div>
      <div>
        <div style={{ fontWeight: 900, fontSize: '1rem' }}>{group.name}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
          👥 {group.member_count ?? '—'} members
        </div>
      </div>
    </div>
    <button className="btn-3d btn-3d-blue" onClick={() => onOpen(group.id)} style={{ fontSize: '0.85rem' }}>
      Open →
    </button>
  </div>
);

export const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    groupsApi.listGroups()
      .then(g => { if (mounted) setGroups(g); })
      .catch(err => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleCreated = (group: Group) => {
    setGroups(prev => [group, ...prev]);
    setShowCreate(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple-dark))',
        borderRadius: 'var(--radius-xl)', padding: '1.5rem 1.75rem',
        color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem', boxShadow: '0 6px 16px rgba(206,130,255,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px solid rgba(255,255,255,0.4)' }}>
            ⚔️
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>Groups & Battles</h1>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.2rem' }}>Study together, compete together</div>
          </div>
        </div>
        <button className="btn-3d btn-3d-white" onClick={() => setShowCreate(true)} style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-purple-dark)' }}>
          ➕ Create Group
        </button>
      </div>

      {/* Create group form */}
      {showCreate && (
        <CreateGroupForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ background: 'var(--color-red-light)', border: '2px solid var(--color-red)', padding: '1rem 1.25rem', color: 'var(--color-red-dark)', fontWeight: 700 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Groups list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 700 }}>
          ⏳ Loading your groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.5rem' }}>No groups yet</div>
          <div style={{ fontSize: '0.9rem' }}>Create a group to start battling with friends!</div>
          <button className="btn-3d btn-3d-purple" onClick={() => setShowCreate(true)} style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
            ➕ Create Your First Group
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map(g => (
            <GroupCard key={g.id} group={g} onOpen={id => navigate(`/groups/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};
