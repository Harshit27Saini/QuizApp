import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { friendService, type LeaderboardEntry, type FriendRequest } from '../services/friends';
import { xpService } from '../services/xp';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';

export const LeaderboardPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(friendService.getLeaderboard('all'));
  const [requests, setRequests] = useState<FriendRequest[]>(friendService.getIncomingRequests());
  const [friendSearch, setFriendSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('recall_user_profile') || 'null');
    } catch {
      return null;
    }
  })();

  const userHandle = currentUser?.email || 'guest_playtester@recall.local';

  useEffect(() => {
    let isMounted = true;
    const handleUpdate = async () => {
      try {
        if (filter === 'all') {
          const apiEntries = await api.getSocialLeaderboard();
          if (isMounted && Array.isArray(apiEntries) && apiEntries.length > 0) {
            setLeaderboard(apiEntries);
            setRequests(friendService.getIncomingRequests());
            return;
          }
        }
      } catch {}
      if (isMounted) {
        setLeaderboard(friendService.getLeaderboard(filter));
        setRequests(friendService.getIncomingRequests());
      }
    };

    handleUpdate();

    window.addEventListener('recall:friends-changed', handleUpdate);
    window.addEventListener('recall:friend-requests-changed', handleUpdate);
    window.addEventListener('recall:xp-changed', handleUpdate);
    window.addEventListener('recall:auth-changed', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('recall:friends-changed', handleUpdate);
      window.removeEventListener('recall:friend-requests-changed', handleUpdate);
      window.removeEventListener('recall:xp-changed', handleUpdate);
      window.removeEventListener('recall:auth-changed', handleUpdate);
    };
  }, [filter]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = friendSearch.trim();
    if (!query) return;

    // Try cloud API first if logged in
    try {
      if (localStorage.getItem('recall_auth_token')) {
        await api.sendFriendRequest(query);
        setToastMessage(`🎉 Friend request sent to ${query}!`);
        soundManager.playCorrect();
        triggerConfetti();
        setFriendSearch('');
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
    } catch (err: any) {
      // If cloud returns an error (e.g. self-add or already friend), show error
      if (err.message && !err.message.includes('401')) {
        setToastMessage(`⚠️ ${err.message}`);
        soundManager.playError();
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
    }

    // Fall back to immediate simulated playtest friend
    const res = friendService.sendFriendRequest(query);
    setToastMessage(res.message);
    setFriendSearch('');
    setLeaderboard(friendService.getLeaderboard(filter));
    if (res.success) {
      soundManager.playCorrect();
      triggerConfetti();
    } else {
      soundManager.playError();
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyHandle = () => {
    navigator.clipboard.writeText(userHandle);
    setCopied(true);
    setToastMessage(`📋 Copied handle "${userHandle}" to clipboard! Share it with a friend.`);
    soundManager.playCorrect();
    setTimeout(() => {
      setCopied(false);
      setToastMessage(null);
    }, 3000);
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      if (localStorage.getItem('recall_auth_token')) {
        await api.acceptFriendRequest(id);
      }
    } catch {}

    friendService.acceptRequest(id);
    setRequests(friendService.getIncomingRequests());
    setLeaderboard(friendService.getLeaderboard(filter));
    soundManager.playVictory();
    triggerConfetti();
    setToastMessage('🎉 Friend request accepted! You can now compete on the leaderboard.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      if (localStorage.getItem('recall_auth_token')) {
        await api.declineFriendRequest(id);
      }
    } catch {}

    friendService.declineRequest(id);
    setRequests(friendService.getIncomingRequests());
  };

  const handleHighFive = async (friendId: string, name: string) => {
    try {
      if (localStorage.getItem('recall_auth_token')) {
        await api.cheerFriend(friendId);
      }
    } catch {}

    const ok = friendService.sendHighFive(friendId);
    if (ok) {
      soundManager.playCorrect();
      triggerConfetti();
      setToastMessage(`✋ High-five sent to ${name}! +5 XP earned for encouraging a friend!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const topThree = leaderboard.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-gold), #e08400)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 6px 16px rgba(255, 200, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            border: '2px solid rgba(255, 255, 255, 0.5)'
          }}>
            🏆
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ background: '#ffffff', color: 'var(--color-gold-dark)', fontWeight: 900, fontSize: '0.75rem' }}>
                GOLD LEAGUE 🥇
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Season ends in 2d 14h
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.2rem 0 0 0' }}>
              Weekly Study Leaderboard
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="badge badge-xp" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            ⚡ {xpService.getBalance()} Your XP
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="card" style={{
          background: 'rgba(88, 204, 2, 0.15)',
          borderLeft: '4px solid var(--color-green)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '0.95rem' }}>
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Incoming Friend Requests Alert */}
      {requests.length > 0 && (
        <div className="card" style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-surface)',
          border: '2px solid var(--color-blue)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-blue-dark)' }}>
            <span>📬</span>
            <span>Pending Friend Requests ({requests.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {requests.map(r => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--color-bg)',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{r.avatarIcon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{r.fromName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.fromEmail} • {r.timestamp}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-3d btn-3d-green"
                    onClick={() => handleAcceptRequest(r.id)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    Accept ✓
                  </button>
                  <button
                    className="btn-3d btn-3d-white"
                    onClick={() => handleDeclineRequest(r.id)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Podium (Top 3) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        alignItems: 'flex-end'
      }}>
        {topThree.map((user, idx) => {
          const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
          const borders = ['var(--color-gold)', '#94a3b8', '#cd7f32'];
          return (
            <div
              key={user.userId}
              className="card"
              style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
                border: `3px solid ${borders[idx]}`,
                background: user.isCurrentUser ? 'var(--color-green-light)' : 'var(--color-surface)',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: borders[idx],
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.75rem',
                padding: '0.2rem 0.75rem',
                borderRadius: 'var(--radius-full)'
              }}>
                {medals[idx]}
              </div>

              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                margin: '0.5rem auto 0.75rem auto',
                overflow: 'hidden',
                border: '2px solid var(--color-border)',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.avatarIcon
                )}
              </div>

              <div style={{ fontWeight: 900, fontSize: '1rem' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Cheerleader: {user.cheerleader}
              </div>

              <div className="badge badge-xp" style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                ⚡ {user.weeklyXp} XP
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Add Friend Form + Share Handle */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.625rem 0.875rem',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px dashed var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 800, color: 'var(--color-text-subtle)' }}>Your Shareable Handle:</span>
            <code style={{ fontWeight: 900, color: 'var(--color-blue-dark)', background: 'var(--color-surface-hover)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
              {userHandle}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyHandle}
            className="btn-3d btn-3d-white"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Handle'}
          </button>
        </div>

        <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Add playtest friend by email (e.g. rohan@gmail.com)..."
            value={friendSearch}
            onChange={e => setFriendSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-main)',
              fontSize: '0.9rem'
            }}
          />
          <button type="submit" className="btn-3d btn-3d-blue" style={{ fontSize: '0.85rem' }}>
            ➕ Add Friend
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            className={`btn-3d ${filter === 'all' ? 'btn-3d-gold' : 'btn-3d-white'}`}
            style={{ fontSize: '0.85rem' }}
          >
            🏆 All League Learners
          </button>
          <button
            onClick={() => setFilter('friends')}
            className={`btn-3d ${filter === 'friends' ? 'btn-3d-blue' : 'btn-3d-white'}`}
            style={{ fontSize: '0.85rem' }}
          >
            👥 Friends Only ({friendService.getFriends().length})
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-green-dark)' }}>
          🟢 Top 3 promote to Diamond League on Sunday!
        </div>
      </div>

      {/* Leaderboard Table List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {leaderboard.map(entry => (
          <div
            key={entry.userId}
            className="card"
            style={{
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              border: entry.isCurrentUser
                ? '3px solid var(--color-green)'
                : '2px solid var(--color-border)',
              background: entry.isCurrentUser
                ? 'var(--color-green-light)'
                : 'var(--color-surface)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              {/* Rank Badge */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: entry.rank <= 3 ? 'var(--color-gold)' : 'var(--color-surface-hover)',
                color: entry.rank <= 3 ? '#ffffff' : 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.9rem',
                flexShrink: 0
              }}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '2px solid var(--color-border)',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                flexShrink: 0
              }}>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  entry.avatarIcon
                )}
              </div>

              {/* Name & Cheerleader */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>{entry.name}</span>
                  {entry.isCurrentUser && (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      YOU
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  🐾 Cheerleader: {entry.cheerleader} • 🔥 {entry.streak} Day Streak
                </div>
              </div>
            </div>

            {/* Score & Social Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-xp" style={{ fontSize: '0.85rem' }}>
                ⚡ {entry.weeklyXp} XP
              </span>

              {!entry.isCurrentUser && (
                <button
                  className="btn-3d btn-3d-white"
                  onClick={() => handleHighFive(entry.userId, entry.name)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Send High Five (+5 XP)"
                >
                  ✋ Cheer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

