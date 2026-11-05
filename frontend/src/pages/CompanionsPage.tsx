import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { companionService, type Companion } from '../services/companions';
import { triggerConfetti } from '../utils/confetti';
import { soundManager } from '../utils/sound';

export const CompanionsPage: React.FC = () => {
  const [companions, setCompanions] = useState<Companion[]>(companionService.listCompanions());
  const [activeId, setActiveId] = useState<string>(companionService.getActiveCompanion().id);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Add friend state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendNickname, setFriendNickname] = useState('');
  const [friendCheer, setFriendCheer] = useState('');

  const currentProgress = companionService.getOverallProgress();

  const handleSelect = (comp: Companion) => {
    if (!companionService.isCompanionUnlocked(comp)) {
      soundManager.playError();
      if (comp.unlockRequirement?.type === 'xp') {
        const cost = comp.unlockRequirement.cost || 100;
        setLockedNotice(`🔒 ${comp.name} is available in the Shop for ${cost} XP! Go to the Shop to unlock.`);
      } else {
        const req = comp.unlockRequirement?.threshold || 90;
        setLockedNotice(`🔒 ${comp.name} is locked! Reach ${req}% syllabus mastery to unlock. Your highest progress is currently ${currentProgress}%. Keep conquering units on your learning path!`);
      }
      setTimeout(() => setLockedNotice(null), 6000);
      return;
    }
    const success = companionService.setActiveCompanion(comp.id);
    if (success) {
      setActiveId(comp.id);
      soundManager.playCorrect();
      triggerConfetti();
      setLockedNotice(null);
    }
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) return;

    const newFriend = companionService.addFriendCompanion(
      friendName.trim(),
      friendNickname.trim(),
      friendCheer.trim()
    );

    setCompanions(companionService.listCompanions());
    handleSelect(newFriend);
    setShowAddFriend(false);
    setFriendName('');
    setFriendNickname('');
    setFriendCheer('');
  };

  const vipCompanions = companions.filter(c => c.category === 'vip');
  const petCompanions = companions.filter(c => c.category === 'pet');
  const friendCompanions = companions.filter(c => c.category === 'friend');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-main)' }}>
            Study Companions & Cheerleaders 🐾
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Choose who stands beside your learning path and cheers you on through dense syllabi!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop" className="btn-3d btn-3d-gold" style={{ fontSize: '0.85rem' }}>
            🛒 XP Cheerleader Shop
          </Link>
          <button
            className="btn-3d btn-3d-white"
            onClick={() => setShowAddFriend(prev => !prev)}
            style={{ fontSize: '0.85rem' }}
          >
            {showAddFriend ? '✕ Cancel' : '➕ Add Friend'}
          </button>
        </div>
      </div>

      {/* Locked Companion Notice Banner */}
      {lockedNotice && (
        <div className="card" style={{
          background: 'rgba(255, 75, 75, 0.1)',
          borderLeft: '4px solid var(--color-error)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease'
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-error-dark)', fontSize: '0.9rem' }}>
            {lockedNotice}
          </p>
          <button
            onClick={() => setLockedNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Friend Form Drawer */}
      {showAddFriend && (
        <div className="card" style={{ border: '2px dashed var(--color-green)', background: 'var(--color-green-light)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Add Your Friend as a Study Cheerleader
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Add their name and a personalized cheer catchphrase that will pop up on your streaks!
          </p>

          <form onSubmit={handleAddFriend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Friend's Name (e.g. Rahul, Tanya)"
                value={friendName}
                onChange={e => setFriendName(e.target.value)}
                required
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)' }}
              />
              <input
                type="text"
                placeholder="Nickname / Subtitle"
                value={friendNickname}
                onChange={e => setFriendNickname(e.target.value)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)' }}
              />
            </div>
            <input
              type="text"
              placeholder="Custom Cheer Catchphrase (e.g. 'Bro you got this exam in the bag!')"
              value={friendCheer}
              onChange={e => setFriendCheer(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)' }}
            />
            <button type="submit" className="btn-3d btn-3d-green" style={{ alignSelf: 'flex-start' }}>
              ✓ Save Friend Companion
            </button>
          </form>
        </div>
      )}

      {/* Section 1: VIP (Nandhini & You) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>👑</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            VIP Cheerleaders
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {vipCompanions.map(c => {
            const isSelected = c.id === activeId;
            const isLocked = !companionService.isCompanionUnlocked(c);
            return (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                className="card"
                style={{
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  border: isSelected
                    ? '3px solid var(--color-green)'
                    : isLocked
                    ? '2px dashed var(--color-border)'
                    : '2px solid var(--color-border)',
                  background: isSelected
                    ? 'var(--color-green-light)'
                    : isLocked
                    ? 'var(--color-surface-hover)'
                    : 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative',
                  opacity: isLocked ? 0.88 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ background: c.badgeColor + '25', color: c.badgeColor, border: `1.5px solid ${c.badgeColor}` }}>
                    {c.badgeText}
                  </span>
                  {isSelected ? (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      ACTIVE ✓
                    </span>
                  ) : isLocked ? (
                    <span className="badge" style={{ background: 'rgba(255, 75, 75, 0.2)', color: '#ff4b4b', fontSize: '0.75rem', fontWeight: 800 }}>
                      🔒 90% REQUIRED
                    </span>
                  ) : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    fontSize: '2.75rem',
                    width: '68px',
                    height: '68px',
                    borderRadius: 'var(--radius-lg)',
                    background: '#ffffff',
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {companionService.getAvatarUrl(c) ? (
                      <img
                        src={companionService.getAvatarUrl(c)}
                        alt={c.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: isLocked ? 'grayscale(0.7) brightness(0.9)' : 'none'
                        }}
                      />
                    ) : (
                      c.avatarIcon
                    )}
                    {isLocked && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}>
                        🔒
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>{c.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>{c.subtitle}</p>
                  </div>
                </div>

                {isLocked && c.unlockRequirement && (
                  <div style={{ background: 'var(--color-bg)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                      <span>Unlock Progress</span>
                      <span>{currentProgress}% / {c.unlockRequirement.threshold || 90}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (currentProgress / (c.unlockRequirement.threshold || 90)) * 100)}%`,
                        height: '100%',
                        background: 'var(--color-green)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                <div style={{
                  fontSize: '0.825rem',
                  color: 'var(--color-text-main)',
                  background: isLocked ? 'var(--color-bg)' : '#ffffff',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontStyle: 'italic'
                }}>
                  "{c.cheerQuotes[0]}"
                </div>

                <button
                  className={`btn-3d ${isLocked ? 'btn-3d-white' : isSelected ? 'btn-3d-green' : 'btn-3d-white'}`}
                  style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                >
                  {isLocked ? '🔒 90% Mastery Required' : isSelected ? 'Active Companion' : 'Select Companion'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Pets */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🐾</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Pet Squad
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {petCompanions.map(c => {
            const isSelected = c.id === activeId;
            const isLocked = !companionService.isCompanionUnlocked(c);
            const cost = c.unlockRequirement?.cost || 100;
            return (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                className="card"
                style={{
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  border: isSelected
                    ? '3px solid var(--color-green)'
                    : isLocked
                    ? '2px dashed var(--color-border)'
                    : '2px solid var(--color-border)',
                  background: isSelected
                    ? 'var(--color-green-light)'
                    : isLocked
                    ? 'var(--color-surface-hover)'
                    : 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  opacity: isLocked ? 0.88 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ background: c.badgeColor + '20', color: c.badgeColor, border: `1.5px solid ${c.badgeColor}` }}>
                    {c.badgeText}
                  </span>
                  {isSelected ? (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      ACTIVE ✓
                    </span>
                  ) : isLocked ? (
                    <span className="badge badge-xp" style={{ fontSize: '0.75rem' }}>
                      🔒 {cost} XP
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(88, 204, 2, 0.15)', color: 'var(--color-green-dark)', fontSize: '0.75rem', fontWeight: 800 }}>
                      UNLOCKED ✓
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    fontSize: '2.5rem',
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-lg)',
                    background: '#ffffff',
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {companionService.getAvatarUrl(c) ? (
                      <img
                        src={companionService.getAvatarUrl(c)}
                        alt={c.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: isLocked ? 'grayscale(0.6)' : 'none'
                        }}
                      />
                    ) : (
                      c.avatarIcon
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900 }}>{c.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.subtitle}</p>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.825rem',
                  color: 'var(--color-text-main)',
                  background: '#ffffff',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontStyle: 'italic'
                }}>
                  "{c.cheerQuotes[0]}"
                </div>

                <button
                  className={`btn-3d ${isSelected ? 'btn-3d-green' : isLocked ? 'btn-3d-gold' : 'btn-3d-white'}`}
                  style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                >
                  {isSelected ? 'Active Companion' : isLocked ? `🔒 Unlock in Shop (${cost} XP)` : 'Select Companion'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Friends */}
      {friendCompanions.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🧑‍🤝‍🧑</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Friends
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {friendCompanions.map(c => {
              const isSelected = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '3px solid var(--color-green)' : '2px solid var(--color-border)',
                    background: isSelected ? 'var(--color-green-light)' : 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge" style={{ background: '#10b98125', color: '#10b981' }}>
                      FRIEND
                    </span>
                    {isSelected && <span className="badge badge-success">ACTIVE ✓</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>{c.avatarIcon}</div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900 }}>{c.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.subtitle}</p>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.825rem', fontStyle: 'italic', background: '#fff', padding: '0.5rem', borderRadius: '8px' }}>
                    "{c.cheerQuotes[0]}"
                  </div>

                  <button className={`btn-3d ${isSelected ? 'btn-3d-green' : 'btn-3d-white'}`}>
                    {isSelected ? 'Active Companion' : 'Select Companion'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

