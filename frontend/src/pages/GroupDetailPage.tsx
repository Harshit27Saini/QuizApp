import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi, battlesApi, type GroupDetail, type GroupMember, type Battle, type BattleMode } from '../services/battles';
import { api } from '../services/api';
import type { Quiz } from '../types';

const BATTLE_MODES: { mode: BattleMode; label: string }[] = [
  { mode: '1v1', label: '1v1 Blitz' },
  { mode: 'nvn', label: 'Team Battle' },
  { mode: 'marathon', label: 'Marathon' },
  { mode: 'sudden_death', label: 'Sudden Death' },
];

const MemberRow: React.FC<{ member: GroupMember; isOwner: boolean; onKick: (uid: string) => void }> = ({ member, isOwner, onKick }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-surface-hover)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{member.name || member.email.split('@')[0]}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {member.role === 'owner' && (
        <span className="badge badge-xp" style={{ fontSize: '0.65rem' }}>👑 Owner</span>
      )}
      {isOwner && member.role !== 'owner' && (
        <button className="btn-3d btn-3d-white" onClick={() => onKick(member.user_id)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--color-red-dark)' }}>
          Kick
        </button>
      )}
    </div>
  </div>
);

const BattleRow: React.FC<{ battle: Battle }> = ({ battle }) => {
  const modeLabel = BATTLE_MODES.find(m => m.mode === battle.mode)?.label ?? battle.mode;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>⚔️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{modeLabel}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{battle.started_at ? new Date(battle.started_at).toLocaleDateString() : 'Pending'}</div>
        </div>
      </div>
      <span className={`badge ${battle.status === 'finished' ? 'badge-success' : 'badge-mode'}`} style={{ fontSize: '0.7rem' }}>
        {battle.status.toUpperCase()}
      </span>
    </div>
  );
};

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Battle panel
  const [showBattle, setShowBattle] = useState(false);
  const [selectedMode, setSelectedMode] = useState<BattleMode>('1v1');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [battleLoading, setBattleLoading] = useState(false);

  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem('recall_user_profile') || 'null')?.id; } catch { return null; }
  })();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!groupId) return;
    let mounted = true;
    Promise.all([
      groupsApi.getGroup(groupId),
      battlesApi.listGroupBattles(groupId),
      api.listQuizzes().catch(() => [] as Quiz[]),
    ]).then(([g, b, qList]) => {
      if (mounted) {
        setGroup(g);
        setBattles(b);
        if (qList && qList.length > 0) {
          setQuizzes(qList);
          setSelectedQuizId(qList[0].id);
        }
      }
    }).catch(err => {
      if (mounted) setError(err.message);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [groupId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !groupId) return;
    setInviteLoading(true);
    try {
      const res = await groupsApi.inviteMember(groupId, inviteEmail.trim());
      showToast(res.message || `🎉 Invite sent to ${inviteEmail}!`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleKick = async (uid: string) => {
    if (!groupId || !window.confirm('Remove this member?')) return;
    try {
      await groupsApi.kickMember(groupId, uid);
      setGroup(prev => prev ? { ...prev, members: prev.members.filter(m => m.user_id !== uid) } : prev);
      showToast('Member removed.');
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const handleStartBattle = async () => {
    if (!groupId) return;
    setBattleLoading(true);
    try {
      const battle = await battlesApi.createBattle(groupId, selectedMode, selectedQuizId || undefined);
      navigate(`/battles/${battle.id}`);
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      setBattleLoading(false);
    }
  };

  const isOwner = group?.owner_id === currentUserId;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
      ⏳ Loading group...
    </div>
  );

  if (error || !group) return (
    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-red-dark)', fontWeight: 700 }}>
      ⚠️ {error || 'Group not found'}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast */}
      {toast && (
        <div className="card" style={{ background: 'rgba(88,204,2,0.12)', borderLeft: '4px solid var(--color-green)', padding: '0.875rem 1.25rem', fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple-dark))', borderRadius: 'var(--radius-xl)', padding: '1.5rem 1.75rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
            {group.emoji}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{group.name}</h1>
            <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.2rem' }}>👥 {group.members.length} members</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button className="btn-3d btn-3d-white" onClick={() => setShowInvite(v => !v)} style={{ fontSize: '0.85rem', color: 'var(--color-purple-dark)', fontWeight: 900 }}>
            📧 Invite Friend
          </button>
          <button className="btn-3d btn-3d-green" onClick={() => setShowBattle(v => !v)} style={{ fontSize: '0.85rem', fontWeight: 900 }}>
            ⚔️ Start Battle
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--color-blue)' }}>
          <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-blue-dark)', marginBottom: '0.75rem' }}>📧 Invite by Email</div>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="friend@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', fontSize: '0.9rem' }}
            />
            <button type="submit" className="btn-3d btn-3d-blue" disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? '⏳ Sending...' : '➕ Send Invite'}
            </button>
            <button type="button" className="btn-3d btn-3d-white" onClick={() => setShowInvite(false)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Battle start panel */}
      {showBattle && (
        <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--color-green)' }}>
          <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-green-dark)', marginBottom: '0.875rem' }}>⚔️ Choose Battle Mode</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {BATTLE_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                className={`btn-3d ${selectedMode === mode ? 'btn-3d-green' : 'btn-3d-white'}`}
                onClick={() => setSelectedMode(mode)}
                style={{ fontSize: '0.85rem' }}
              >
                {label}
              </button>
            ))}
          </div>
          {quizzes.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                📚 Select Quiz Material (Optional)
              </label>
              <select
                value={selectedQuizId}
                onChange={e => setSelectedQuizId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--color-text-main)'
                }}
              >
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.title || `Quiz #${q.id.slice(0, 8)}`} ({q.questions?.length ?? 'Quiz'} questions)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn-3d btn-3d-green" onClick={handleStartBattle} disabled={battleLoading}>
              {battleLoading ? '⏳ Creating...' : '🚀 Start!'}
            </button>
            <button className="btn-3d btn-3d-white" onClick={() => setShowBattle(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '0.875rem' }}>👥 Members</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {group.members.map(m => (
            <MemberRow key={m.user_id} member={m} isOwner={isOwner} onKick={handleKick} />
          ))}
        </div>
      </div>

      {/* Past battles */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '0.875rem' }}>⚔️ Past Battles</div>
        {battles.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', padding: '1.5rem' }}>
            No battles yet — start one above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {battles.map(b => <BattleRow key={b.id} battle={b} />)}
          </div>
        )}
      </div>
    </div>
  );
};
