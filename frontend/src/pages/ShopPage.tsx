import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { xpService, type XpWallet } from '../services/xp';
import { companionService, type Companion } from '../services/companions';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';

export const ShopPage: React.FC = () => {
  const [wallet, setWallet] = useState<XpWallet>(xpService.getFullWallet());
  const [companions, setCompanions] = useState<Companion[]>(companionService.listCompanions());
  const [activeCompanionId, setActiveCompanionId] = useState<string>(companionService.getActiveCompanion().id);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleXpChanged = () => {
      setWallet(xpService.getFullWallet());
      setCompanions(companionService.listCompanions());
      setActiveCompanionId(companionService.getActiveCompanion().id);
    };
    window.addEventListener('recall:xp-changed', handleXpChanged);
    return () => window.removeEventListener('recall:xp-changed', handleXpChanged);
  }, []);

  const handleUnlockCompanion = (comp: Companion) => {
    const cost = comp.unlockRequirement?.cost || 100;
    if (wallet.balance < cost) {
      soundManager.playError();
      setToastMessage(`❌ Not enough XP! You need ${cost} XP, but have ${wallet.balance} XP. Earn more by finishing To-Do tasks or quizzes!`);
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    const success = xpService.unlockCompanion(comp.id, cost, comp.name);
    if (success) {
      soundManager.playVictory();
      triggerConfetti();
      companionService.setActiveCompanion(comp.id);
      setActiveCompanionId(comp.id);
      setToastMessage(`🎉 Woohoo! Unlocked ${comp.name} and set as your active study cheerleader!`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleEquipCompanion = (comp: Companion) => {
    companionService.setActiveCompanion(comp.id);
    setActiveCompanionId(comp.id);
    soundManager.playCorrect();
    setToastMessage(`✓ Equipped ${comp.name} as your active cheerleader!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBuyPowerup = (id: string, cost: number, name: string) => {
    if (wallet.balance < cost) {
      soundManager.playError();
      setToastMessage(`❌ Not enough XP! You need ${cost} XP for ${name}.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    const success = xpService.buyItem(id, cost, name);
    if (success) {
      soundManager.playVictory();
      triggerConfetti();
      setToastMessage(`✨ Purchased ${name}! Added to your inventory.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Group companions
  const shopCompanions = companions.filter(c => c.id !== 'founder');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-gold), var(--color-orange))',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
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
            🛒
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              XP Cheerleader & Power-up Shop
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', opacity: 0.95 }}>
              Redeem your hard-earned study XP for new cheerleaders, mascots, and streak shields!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/inventory"
            className="btn-3d btn-3d-white"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            🎒 My Backpack
          </Link>

          {/* Live XP Wallet Display */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-gold-dark)', lineHeight: 1.1 }}>
                {wallet.balance} XP
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Spendable Balance
              </div>
            </div>
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

      {/* Section 1: Cheerleader & Mascot Squad */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🐾</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
              Cheerleader & Mascot Squad
            </h2>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Equipped companion cheers you along your learning paths!
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {shopCompanions.map(c => {
            const isNandhini = c.id === 'nandhini';
            const isUnlocked = companionService.isCompanionUnlocked(c);
            const isEquipped = c.id === activeCompanionId;
            const cost = c.unlockRequirement?.cost || 100;
            const canAfford = wallet.balance >= cost;

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  border: isEquipped
                    ? '3px solid var(--color-green)'
                    : isUnlocked
                    ? '2px solid var(--color-border)'
                    : '2px dashed var(--color-border)',
                  background: isEquipped
                    ? 'var(--color-green-light)'
                    : isUnlocked
                    ? 'var(--color-surface)'
                    : 'var(--color-surface-hover)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge" style={{ background: c.badgeColor + '20', color: c.badgeColor, border: `1.5px solid ${c.badgeColor}` }}>
                      {c.badgeText}
                    </span>
                    {isEquipped ? (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        ACTIVE ✓
                      </span>
                    ) : isUnlocked ? (
                      <span className="badge" style={{ background: 'rgba(88, 204, 2, 0.15)', color: 'var(--color-green-dark)', fontSize: '0.75rem', fontWeight: 800 }}>
                        UNLOCKED ✓
                      </span>
                    ) : isNandhini ? (
                      <span className="badge" style={{ background: 'rgba(255, 75, 75, 0.15)', color: '#ff4b4b', fontSize: '0.75rem', fontWeight: 800 }}>
                        🔒 90% MASTERY
                      </span>
                    ) : (
                      <span className="badge badge-xp" style={{ fontSize: '0.75rem' }}>
                        ⚡ {cost} XP
                      </span>
                    )}
                  </div>

                  {/* Character Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      border: '2px solid var(--color-border)',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}>
                      {companionService.getAvatarUrl(c) ? (
                        <img
                          src={companionService.getAvatarUrl(c)}
                          alt={c.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: !isUnlocked ? 'grayscale(0.6)' : 'none'
                          }}
                        />
                      ) : (
                        c.avatarIcon
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>{c.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>{c.subtitle}</p>
                    </div>
                  </div>

                  {/* Quote preview */}
                  <div style={{
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: 'var(--color-text-main)',
                    background: '#ffffff',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    marginBottom: '1rem'
                  }}>
                    "{c.cheerQuotes[0]}"
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {isEquipped ? (
                    <button className="btn-3d btn-3d-green" style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }} disabled>
                      ✓ Currently Equipped
                    </button>
                  ) : isUnlocked ? (
                    <button
                      className="btn-3d btn-3d-white"
                      style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                      onClick={() => handleEquipCompanion(c)}
                    >
                      Equip Cheerleader
                    </button>
                  ) : isNandhini ? (
                    <Link
                      to="/companions"
                      className="btn-3d btn-3d-white"
                      style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem', textAlign: 'center', display: 'block' }}
                    >
                      🔒 View 90% Mastery Progress
                    </Link>
                  ) : (
                    <button
                      className={`btn-3d ${canAfford ? 'btn-3d-gold' : 'btn-3d-white'}`}
                      style={{ width: '100%', padding: '0.625rem', fontSize: '0.85rem' }}
                      onClick={() => handleUnlockCompanion(c)}
                      disabled={!canAfford}
                    >
                      {canAfford ? `⚡ Unlock for ${cost} XP` : `Need ${cost} XP (Have ${wallet.balance})`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Power-ups & Boosters */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🧪</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
            Power-ups & Shields
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Streak Freeze */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(28, 176, 246, 0.15)', color: 'var(--color-blue)', border: '1px solid var(--color-blue)' }}>
                  SHIELD
                </span>
                <span className="badge badge-xp">⚡ 100 XP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>🛡️</span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>Streak Freeze</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Owned: {wallet.inventory.streak_freeze || 0}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', margin: 0 }}>
                Protects your daily learning streak for 1 day if you miss study practice.
              </p>
            </div>
            <button
              className="btn-3d btn-3d-blue"
              onClick={() => handleBuyPowerup('streak_freeze', 100, 'Streak Freeze')}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              Buy for 100 XP
            </button>
          </div>

          {/* Double XP Potion */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(206, 130, 255, 0.15)', color: '#ce82ff', border: '1px solid #ce82ff' }}>
                  BOOSTER
                </span>
                <span className="badge badge-xp">⚡ 150 XP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>🧪</span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>2X XP Booster Potion</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Owned: {wallet.inventory.double_xp_potion || 0}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', margin: 0 }}>
                Doubles all XP earned from quizzes and learning path stepping stones for 30 minutes!
              </p>
            </div>
            <button
              className="btn-3d btn-3d-gold"
              onClick={() => handleBuyPowerup('double_xp_potion', 150, '2X XP Booster Potion')}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              Buy for 150 XP
            </button>
          </div>

          {/* Study Blitz Espresso */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(255, 150, 0, 0.15)', color: 'var(--color-orange-dark)', border: '1px solid var(--color-orange)' }}>
                  ENERGY
                </span>
                <span className="badge badge-xp">⚡ 75 XP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>☕</span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>Exam Espresso</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Owned: {wallet.inventory.concept_coffee || 0}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', margin: 0 }}>
                Instant mental refresher. Automatically resets review intervals for quick memory refresh.
              </p>
            </div>
            <button
              className="btn-3d btn-3d-orange"
              onClick={() => handleBuyPowerup('concept_coffee', 75, 'Exam Espresso')}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              Buy for 75 XP
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Recent XP History Log */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📜</span>
          <span>Recent XP Ledger</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(wallet.transactions || []).slice(0, 8).map(tx => (
            <div
              key={tx.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{tx.type === 'earn' ? '🟢' : '🔴'}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{tx.reason}</span>
              </div>
              <span style={{
                fontWeight: 900,
                color: tx.type === 'earn' ? 'var(--color-green-dark)' : 'var(--color-red)'
              }}>
                {tx.type === 'earn' ? `+${tx.amount} XP` : `-${tx.amount} XP`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
