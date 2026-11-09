import React from 'react';

interface NandhiniUnlockModalProps {
  isOpen: boolean;
  onSetCompanion: () => void;
  onClose: () => void;
}

export const NandhiniUnlockModal: React.FC<NandhiniUnlockModalProps> = ({
  isOpen,
  onSetCompanion,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        padding: '2.5rem 1.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        borderRadius: 'var(--radius-xl)',
        border: '4px solid var(--color-green)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{ fontSize: '3rem' }}>👑 ⭐</div>
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid var(--color-green)',
          boxShadow: '0 0 20px rgba(88, 204, 2, 0.5)'
        }}>
          <img src="/avatars/nandhini_3d.png" alt="Nandhini" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text-main)', margin: 0 }}>
          Nandhini Unlocked! 🎉
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
          Phenomenal dedication! You've achieved <strong>90% syllabus mastery</strong>. Nandhini is now unlocked as your #1 Study Companion!
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
          <button
            className="btn-3d btn-3d-green"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            onClick={onSetCompanion}
          >
            Set Nandhini as Active Companion ⭐
          </button>
          <button
            className="btn-3d btn-3d-white"
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
            onClick={onClose}
          >
            Keep Current Companion
          </button>
        </div>
      </div>
    </div>
  );
};
