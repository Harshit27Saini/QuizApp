import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { xpService, type XpWallet } from '../services/xp';
import { companionService, type Companion } from '../services/companions';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';

export const InventoryPage: React.FC = () => {
  const [wallet, setWallet] = useState<XpWallet>(xpService.getFullWallet());
  const [companions, setCompanions] = useState<Companion[]>(companionService.listCompanions());
  const [activeCompanionId, setActiveCompanionId] = useState<string>(companionService.getActiveCompanion().id);
  const [doubleXpInfo, setDoubleXpInfo] = useState(xpService.isDoubleXpActive());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setWallet(xpService.getFullWallet());
      setCompanions(companionService.listCompanions());
      setActiveCompanionId(companionService.getActiveCompanion().id);
      setDoubleXpInfo(xpService.isDoubleXpActive());
    };

    window.addEventListener('recall:xp-changed', handleUpdate);
    const interval = setInterval(() => {
      setDoubleXpInfo(xpService.isDoubleXpActive());
    }, 1000);

    return () => {
      window.removeEventListener('recall:xp-changed', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleEquip = (comp: Companion) => {
    companionService.setActiveCompanion(comp.id);
    setActiveCompanionId(comp.id);
    soundManager.playCorrect();
    setToastMessage(`✓ Equipped ${comp.name} as your active cheerleader!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleActivatePotion = () => {
    const success = xpService.activateDoubleXp();
    if (success) {
      soundManager.playVictory();
      triggerConfetti();
      setToastMessage('🧪 2X XP Booster Activated! Earn double XP on all quizzes and units for 30 minutes!');
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleDrinkEspresso = () => {
    const success = xpService.consumeItem('concept_coffee');
    if (success) {
      soundManager.playCorrect();
      triggerConfetti();
      setToastMessage('☕ Exam Espresso consumed! Mental energy restored + active review primed!');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const freezeCount = wallet.inventory.streak_freeze || 0;
  const potionCount = wallet.inventory.double_xp_potion || 0;
  const coffeeCount = wallet.inventory.concept_coffee || 0;

  const unlockedCompanions = companions.filter(c => companionService.isCompanionUnlocked(c));

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-blue), #0d8abc)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 6px 16px rgba(28, 176, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            border: '2px solid rgba(255, 255, 255, 0.4)'
          }}>
            🎒
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>
              Backpack & Inventory
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', opacity: 0.95 }}>
              Manage your purchased streak shields, booster potions, and cheerleaders!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="badge badge-xp" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            ⚡ {wallet.balance} XP
          </div>
          <Link to="/shop" className="btn-3d btn-3d-gold" style={{ fontSize: '0.85rem' }}>
            🛒 Shop More
          </Link>
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

      {/* Active Boosters Strip */}
      {doubleXpInfo.active && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(206, 130, 255, 0.15), rgba(28, 176, 246, 0.12))',
          border: '2px solid var(--color-purple)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <span style={{ fontSize: '2rem' }}>🧪</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-purple-dark)' }}>
                2X XP Booster Potion Active!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                All earned XP across quizzes, learning paths, and to-dos is doubled.
              </div>
            </div>
          </div>
          <div className="badge" style={{ background: 'var(--color-purple)', color: '#ffffff', fontSize: '1rem', fontWeight: 900, padding: '0.5rem 1rem' }}>
            ⏱️ {formatTimer(doubleXpInfo.secondsRemaining)} Left
          </div>
        </div>
      )}

      {/* Section 1: Held Power-ups */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
            Power-Ups & Shields Held
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          {/* Streak Freeze Card */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge" style={{ background: 'rgba(28, 176, 246, 0.15)', color: 'var(--color-blue)', border: '1px solid var(--color-blue)' }}>
                  SHIELD
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                  {freezeCount > 0 ? `${freezeCount} HELD` : '0 HELD'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>🛡️</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>Streak Freeze</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0 0' }}>
                    Automatic Miss Protection
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', margin: 0, lineHeight: 1.4 }}>
                {freezeCount > 0
                  ? 'Active in your backpack! If you miss a calendar day of study, 1 shield will auto-consume to protect your streak flame.'
                  : 'You do not currently hold any streak freeze shields. Visit the shop to purchase one for 100 XP.'}
              </p>
            </div>

            {freezeCount > 0 ? (
              <div style={{
                background: 'rgba(28, 176, 246, 0.1)',
                border: '1.5px solid var(--color-blue)',
                padding: '0.625rem',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: 'var(--color-blue-dark)'
              }}>
                ✓ AUTO-ARMED & READY
              </div>
            ) : (
              <Link to="/shop" className="btn-3d btn-3d-blue" style={{ width: '100%', fontSize: '0.85rem', textAlign: 'center' }}>
                🛒 Buy in Shop (100 XP)
              </Link>
            )}
          </div>

          {/* Double XP Potion Card */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge" style={{ background: 'rgba(206, 130, 255, 0.15)', color: '#ce82ff', border: '1px solid #ce82ff' }}>
                  BOOSTER
                </span>
                <span className="badge" style={{ background: potionCount > 0 ? 'var(--color-purple)' : 'var(--color-border)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 900 }}>
                  {potionCount} HELD
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>🧪</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>2X XP Booster Potion</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0 0' }}>
                    30-Minute Double Reward
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', margin: 0, lineHeight: 1.4 }}>
                Doubles all XP earned from quizzes and learning path stepping stones for 30 minutes!
              </p>
            </div>

            {potionCount > 0 ? (
              <button
                className="btn-3d btn-3d-purple"
                onClick={handleActivatePotion}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                🧪 Activate 30-Min Boost
              </button>
            ) : (
              <Link to="/shop" className="btn-3d btn-3d-white" style={{ width: '100%', fontSize: '0.85rem', textAlign: 'center' }}>
                🛒 Buy in Shop (150 XP)
              </Link>
            )}
          </div>

          {/* Exam Espresso Card */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge" style={{ background: 'rgba(255, 150, 0, 0.15)', color: 'var(--color-orange-dark)', border: '1px solid var(--color-orange)' }}>
                  ENERGY
                </span>
                <span className="badge" style={{ background: coffeeCount > 0 ? 'var(--color-orange)' : 'var(--color-border)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 900 }}>
                  {coffeeCount} HELD
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>☕</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>Exam Espresso</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0 0' }}>
                    Quick Focus Refresh
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', margin: 0, lineHeight: 1.4 }}>
                Instant mental refresher. Clears review fatigue and primes active recall memory.
              </p>
            </div>

            {coffeeCount > 0 ? (
              <button
                className="btn-3d btn-3d-orange"
                onClick={handleDrinkEspresso}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                ☕ Drink Espresso
              </button>
            ) : (
              <Link to="/shop" className="btn-3d btn-3d-white" style={{ width: '100%', fontSize: '0.85rem', textAlign: 'center' }}>
                🛒 Buy in Shop (75 XP)
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: My Cheerleader Collection */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🐾</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
              My Cheerleaders ({unlockedCompanions.length} Unlocked)
            </h2>
          </div>
          <Link to="/companions" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)' }}>
            All Companions →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          {unlockedCompanions.map(c => {
            const isEquipped = c.id === activeCompanionId;
            return (
              <div
                key={c.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  border: isEquipped ? '3px solid var(--color-green)' : '2px solid var(--color-border)',
                  background: isEquipped ? 'var(--color-green-light)' : 'var(--color-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ background: c.badgeColor + '20', color: c.badgeColor, border: `1.5px solid ${c.badgeColor}` }}>
                    {c.badgeText}
                  </span>
                  {isEquipped && (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      ACTIVE CHEERLEADER ✓
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '2px solid var(--color-border)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    flexShrink: 0
                  }}>
                    {companionService.getAvatarUrl(c) ? (
                      <img
                        src={companionService.getAvatarUrl(c)}
                        alt={c.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      c.avatarIcon
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>{c.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0 0' }}>{c.subtitle}</p>
                  </div>
                </div>

                <button
                  className={`btn-3d ${isEquipped ? 'btn-3d-green' : 'btn-3d-white'}`}
                  style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                  onClick={() => handleEquip(c)}
                  disabled={isEquipped}
                >
                  {isEquipped ? '✓ Currently Equipped' : 'Equip Cheerleader'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

