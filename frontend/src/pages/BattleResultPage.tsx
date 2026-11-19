import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { battlesApi, type BattleDetail, type BattleScore } from '../services/battles';

const MEDALS = ['🥇', '🥈', '🥉'];

const BATTLE_MODE_LABELS: Record<string, string> = {
  '1v1': '1v1 Blitz',
  'nvn': 'Team Battle',
  'marathon': 'Marathon',
  'sudden_death': 'Sudden Death',
};

// XP awarded per rank (approximated — actual from backend on submit)
const XP_BY_RANK: Record<number, number> = { 1: 60, 2: 30, 3: 20 };
const BASE_XP = 10;

const ResultRow: React.FC<{ score: BattleScore; rank: number }> = ({ score, rank }) => {
  const xp = XP_BY_RANK[rank] ?? BASE_XP;
  return (
    <div
      className="card"
      style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        border: rank === 1 ? '3px solid var(--color-gold)' : rank === 2 ? '2px solid #94a3b8' : rank === 3 ? '2px solid #cd7f32' : '2px solid var(--color-border)',
        background: rank === 1 ? 'var(--color-gold-light)' : 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '40px', textAlign: 'center', fontSize: rank <= 3 ? '1.6rem' : '1rem', fontWeight: 900 }}>
          {rank <= 3 ? MEDALS[rank - 1] : rank}
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-surface-hover)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>👤</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{score.name || score.email.split('@')[0]}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {score.accuracy}% accuracy • {score.time_taken_seconds}s
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="badge badge-xp" style={{ fontSize: '0.85rem' }}>⚡ {score.score} pts</span>
        <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>+{xp} XP</span>
      </div>
    </div>
  );
};

export const BattleResultPage: React.FC = () => {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);

  useEffect(() => {
    if (!battleId) return;
    battlesApi.getBattle(battleId)
      .then(setBattle)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [battleId]);

  const handleRematch = async () => {
    if (!battle) return;
    setRematching(true);
    try {
      const newBattle = await battlesApi.createBattle(battle.group_id, battle.mode, battle.quiz_id);
      navigate(`/battles/${newBattle.id}`);
    } catch (err: any) {
      setError(err.message);
      setRematching(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>⏳ Loading results...</div>
  );

  if (error || !battle) return (
    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-red-dark)', fontWeight: 700 }}>
      ⚠️ {error || 'Battle not found'}
    </div>
  );

  const sortedScores = [...battle.scores].sort((a, b) => b.score - a.score);
  const winner = sortedScores[0];
  const modeLabel = BATTLE_MODE_LABELS[battle.mode] ?? battle.mode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Victory Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-gold), var(--color-orange-dark))',
        borderRadius: 'var(--radius-xl)', padding: '2rem 1.75rem',
        color: '#ffffff', textAlign: 'center',
        boxShadow: '0 6px 24px rgba(255,200,0,0.4)'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 0.5rem 0' }}>Battle Results!</h1>
        <div style={{ fontSize: '1rem', opacity: 0.9, fontWeight: 700 }}>{modeLabel}</div>
        {winner && (
          <div style={{ marginTop: '1rem', fontSize: '1.1rem', fontWeight: 900 }}>
            🥇 Winner: {winner.name || winner.email.split('@')[0]}
          </div>
        )}
      </div>

      {/* Final Scoreboard */}
      <div>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.875rem' }}>📊 Final Scoreboard</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {sortedScores.map((s, idx) => (
            <ResultRow key={s.user_id} score={s} rank={idx + 1} />
          ))}
          {sortedScores.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              No scores recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          className="btn-3d btn-3d-green"
          onClick={handleRematch}
          disabled={rematching}
          style={{ fontSize: '0.9rem', fontWeight: 900 }}
        >
          {rematching ? '⏳ Creating...' : '🔁 Rematch'}
        </button>
        <button
          className="btn-3d btn-3d-white"
          onClick={() => navigate(`/groups/${battle.group_id}`)}
          style={{ fontSize: '0.9rem', fontWeight: 900 }}
        >
          ← Back to Group
        </button>
      </div>
    </div>
  );
};
