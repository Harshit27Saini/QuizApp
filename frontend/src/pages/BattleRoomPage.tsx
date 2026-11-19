import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { battlesApi, type BattleDetail, type BattleScore } from '../services/battles';
import { api } from '../services/api';

const BATTLE_MODE_LABELS: Record<string, string> = {
  '1v1': '1v1 Blitz',
  'nvn': 'Team Battle',
  'marathon': 'Marathon',
  'sudden_death': 'Sudden Death',
};

const PlayerRow: React.FC<{ score: BattleScore; rank: number }> = ({ score, rank }) => {
  const medals = ['🥇', '🥈', '🥉'];
  const statusLabel = score.eliminated_at ? '💀 Eliminated' : score.score > 0 ? '✅ Finished' : '⏳ Waiting';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ width: '32px', textAlign: 'center', fontSize: rank <= 3 ? '1.3rem' : '0.9rem', fontWeight: 900 }}>
          {rank <= 3 ? medals[rank - 1] : rank}
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-surface-hover)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{score.name || score.email.split('@')[0]}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{statusLabel}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {score.score > 0 && (
          <>
            <span className="badge badge-xp" style={{ fontSize: '0.8rem' }}>⚡ {score.score} pts</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{score.accuracy}% acc</span>
          </>
        )}
      </div>
    </div>
  );
};

export const BattleRoomPage: React.FC = () => {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem('recall_user_profile') || 'null')?.id; } catch { return null; }
  })();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBattle = async () => {
    if (!battleId) return;
    try {
      const data = await battlesApi.getBattle(battleId);
      setBattle(data);
      // Check if current user already in scores
      if (currentUserId && data.scores.some(s => s.user_id === currentUserId)) {
        setJoined(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattle();
    intervalRef.current = setInterval(fetchBattle, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [battleId]);

  const handleJoin = async () => {
    if (!battleId) return;
    setJoining(true);
    try {
      await battlesApi.joinBattle(battleId);
      setJoined(true);
      showToast('🎉 You joined the battle!');
      fetchBattle();
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      setJoining(false);
    }
  };

  const handleStartQuiz = async () => {
    let qId = battle?.quiz_id;
    if (!qId) {
      try {
        const quizzes = await api.listQuizzes();
        if (quizzes && quizzes.length > 0) {
          qId = quizzes[0].id;
        }
      } catch (e) {
        console.error("Auto quiz lookup error", e);
      }
    }

    if (!qId) {
      showToast('⚠️ No quiz available yet. Create a quiz in any collection first!');
      return;
    }
    navigate(`/quizzes/${qId}/session?battle_id=${battleId}`);
  };

  const isCreator = battle?.created_by === currentUserId;
  const sortedScores = battle ? [...battle.scores].sort((a, b) => b.score - a.score) : [];
  const modeLabel = battle ? (BATTLE_MODE_LABELS[battle.mode] ?? battle.mode) : '';

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>⏳ Loading battle room...</div>
  );

  if (error || !battle) return (
    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-red-dark)', fontWeight: 700 }}>
      ⚠️ {error || 'Battle not found'}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div className="card" style={{ background: 'rgba(88,204,2,0.12)', borderLeft: '4px solid var(--color-green)', padding: '0.875rem 1.25rem', fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, var(--color-blue-dark))', borderRadius: 'var(--radius-xl)', padding: '1.5rem 1.75rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 6px 16px rgba(28,176,246,0.3)' }}>
        <div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Battle Room</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0.2rem 0' }}>{modeLabel}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: battle.status === 'finished' ? 'var(--color-green)' : battle.status === 'active' ? 'var(--color-gold)' : 'rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.7rem' }}>
              {battle.status.toUpperCase()}
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>👥 {battle.scores.length} players</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {!joined && battle.status !== 'finished' && (
            <button className="btn-3d btn-3d-green" onClick={handleJoin} disabled={joining} style={{ fontSize: '0.9rem', fontWeight: 900 }}>
              {joining ? '⏳ Joining...' : '🎮 Ready / Join'}
            </button>
          )}
          {joined && battle.status !== 'finished' && (
            <button className="btn-3d btn-3d-gold" onClick={handleStartQuiz} style={{ fontSize: '0.9rem', fontWeight: 900 }}>
              {isCreator ? '🚀 Start Quiz' : '🎮 Play Battle Quiz'}
            </button>
          )}
          {battle.status === 'finished' && (
            <button className="btn-3d btn-3d-purple" onClick={() => navigate(`/battles/${battleId}/result`)} style={{ fontSize: '0.9rem', fontWeight: 900 }}>
              🏆 View Results
            </button>
          )}
        </div>
      </div>

      {/* Live Scoreboard */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div style={{ fontWeight: 900, fontSize: '1rem' }}>📊 Live Scoreboard</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>🔄 Updates every 3s</div>
        </div>
        {sortedScores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
            Waiting for players to join...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedScores.map((s, idx) => (
              <PlayerRow key={s.user_id} score={s} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
