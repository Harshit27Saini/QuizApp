import React, { useState } from 'react';
import { companionService, type Companion } from '../services/companions';
import { triggerConfetti } from '../utils/confetti';
import { soundManager } from '../utils/sound';

export const CompanionsPage: React.FC = () => {
  const [companions, setCompanions] = useState<Companion[]>(companionService.listCompanions());
  const [activeId, setActiveId] = useState<string>(companionService.getActiveCompanion().id);

  // Add friend state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendNickname, setFriendNickname] = useState('');
  const [friendCheer, setFriendCheer] = useState('');

  const handleSelect = (comp: Companion) => {
    companionService.setActiveCompanion(comp.id);
    setActiveId(comp.id);
    soundManager.playCorrect();
    triggerConfetti();
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

        <button
          className="btn-3d btn-3d-green"
          onClick={() => setShowAddFriend(prev => !prev)}
        >
          {showAddFriend ? '✕ Cancel' : '➕ Add Friend'}
        </button>
      </div>

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
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ background: c.badgeColor + '25', color: c.badgeColor, border: `1.5px solid ${c.badgeColor}` }}>
                    {c.badgeText}
                  </span>
                  {isSelected && (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      ACTIVE ✓
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    fontSize: '2.75rem',
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-lg)',
                    background: '#ffffff',
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    {c.avatarIcon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>{c.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{c.subtitle}</p>
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
                  className={`btn-3d ${isSelected ? 'btn-3d-green' : 'btn-3d-white'}`}
                  style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                >
                  {isSelected ? 'Active Companion' : 'Select Companion'}
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
                  <span className="badge" style={{ background: c.badgeColor + '20', color: c.badgeColor, border: `1.5px solid ${c.badgeColor}` }}>
                    {c.badgeText}
                  </span>
                  {isSelected && (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      ACTIVE ✓
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    fontSize: '2.5rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-lg)',
                    background: '#ffffff',
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {c.avatarIcon}
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
                  className={`btn-3d ${isSelected ? 'btn-3d-green' : 'btn-3d-white'}`}
                  style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                >
                  {isSelected ? 'Active Companion' : 'Select Companion'}
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
