import React from 'react';

interface MilestoneChestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MilestoneChestModal: React.FC<MilestoneChestModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎁✨</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Milestone Chest Unlocked!</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginTop: '0.5rem' }}>
          Awesome dedication! You've unlocked bonus XP and syllabus momentum!
        </p>
        <div className="badge badge-xp" style={{ fontSize: '1.25rem', padding: '0.75rem 1.5rem', margin: '1.5rem 0' }}>
          ⚡ +50 BONUS XP EARNED!
        </div>
        <button
          className="btn-3d btn-3d-green"
          onClick={onClose}
          style={{ width: '100%', padding: '0.875rem' }}
        >
          Claim & Continue Quest →
        </button>
      </div>
    </div>
  );
};
