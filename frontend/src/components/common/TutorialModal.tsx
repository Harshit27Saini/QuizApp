import React, { useState } from 'react';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  description: string;
  details: string[];
  illustrationText?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    badge: 'WELCOME TO RECALL',
    badgeColor: 'var(--color-green)',
    icon: '⚡',
    title: 'Transform Slides & Notes into Active Learning',
    description: 'No more passive reading or endless PDF scrolling. Recall turns your course materials into an interactive, bite-sized curriculum designed for true active recall.',
    details: [
      '📁 Upload any PDF, PowerPoint (PPTX), Word (DOCX), or text document.',
      '🎯 We auto-chunk long materials into manageable 4–8 slide study goals.',
      '🧠 Practice with syllabus-grounded questions that cite your exact slides.'
    ]
  },
  {
    badge: 'STUDY COMPANIONS',
    badgeColor: 'var(--color-blue)',
    icon: '🐾',
    title: 'Meet Your Personal Cheerleaders',
    description: 'You never study alone. Pick a study companion to cheer you on, celebrate your wins, and give you quick memory tricks along the path.',
    details: [
      '⭐ Nandhini: Your #1 top study mate and energetic syllabus motivator.',
      '🐈 Connie: Himalayan Persian Cat — razor-sharp, polite & intellectually precise.',
      '🐱 Milo: White & Black Indie Cat — clever, observant & street-smart.',
      '🐶 Scooby: Grey Lhasa Apso — calm, patient & protective under pressure.'
    ]
  },
  {
    badge: 'GAMIFIED LEARNING PATHS',
    badgeColor: 'var(--color-gold-dark)',
    icon: '🗺️',
    title: 'Conquer Bite-Sized Stepping Stones',
    description: 'Progress through a serpentine path of bite-sized milestones. Each stone focuses on a specific unit, offering instant feedback and explanations.',
    details: [
      '💎 Earn XP coins for completing stones, flashcards, and practice quizzes.',
      '🎁 Unlock Milestone Chests with bonus XP, streak shields, and cheerleaders.',
      '⚡ Test your knowledge in the Exam Hall Simulator with STRICT document grounding.'
    ]
  },
  {
    badge: 'STREAKS & LEAGUES',
    badgeColor: 'var(--color-orange-dark)',
    icon: '🔥',
    title: 'Build Daily Habits & Compete with Friends',
    description: 'Study every calendar day to keep your streak flame glowing. Climb the weekly Gold League alongside classmates and study partners.',
    details: [
      '🛡️ Streak Freezes: Equip shields in your Backpack to auto-protect your streak if life gets busy.',
      '🏆 Weekly Leagues: Earn XP to climb promotion zones and reach the Diamond tier.',
      '✋ High-Five Friends: Send friend requests, share your study handle, and exchange XP cheers.'
    ]
  },
  {
    badge: 'READY TO START',
    badgeColor: 'var(--color-green)',
    icon: '🚀',
    title: "You're All Set to Learn!",
    description: 'Upload your first document or explore the study tools. Remember: one small 5-minute study sprint every day compounds into mastery!',
    details: [
      '🛋️ "Just Start" Mode: Feeling stuck? Run a peaceful 5-minute focus sprint.',
      '🔍 UI Display Scale: Tap "Aa" in the top bar to adjust text size anytime.',
      '🐞 Founder Bug Inbox: Click "Bug" to share feedback directly with the developer.'
    ]
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      soundManager.playVictory();
      triggerConfetti();
      localStorage.setItem('recall_tutorial_seen', 'true');
      onClose();
    } else {
      soundManager.playCorrect();
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      soundManager.playTick();
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('recall_tutorial_seen', 'true');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem'
      }}
      onClick={handleSkip}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--color-surface)',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header with Step Pill & Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            className="badge"
            style={{
              background: 'var(--color-surface-hover)',
              color: step.badgeColor,
              border: `1.5px solid ${step.badgeColor}`,
              fontSize: '0.75rem',
              fontWeight: 900
            }}
          >
            {step.badge} • STEP {currentStep + 1} OF {TUTORIAL_STEPS.length}
          </span>
          <button
            onClick={handleSkip}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            title="Skip Tutorial"
          >
            ✕ Skip
          </button>
        </div>

        {/* Hero Icon */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '20px',
          background: 'var(--color-surface-hover)',
          border: '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          margin: '0.25rem 0'
        }}>
          {step.icon}
        </div>

        {/* Title & Description */}
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.3 }}>
            {step.title}
          </h2>
          <p style={{ fontSize: '0.925rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
            {step.description}
          </p>
        </div>

        {/* Feature List Bullets */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
          background: 'var(--color-bg)',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--color-border)'
        }}>
          {step.details.map((detail, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--color-green)', fontWeight: 900 }}>•</span>
              <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{detail}</span>
            </div>
          ))}
        </div>

        {/* Step Progress Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentStep(i)}
              style={{
                width: i === currentStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === currentStep ? 'var(--color-blue)' : 'var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Navigation Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className="btn-3d btn-3d-white"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.875rem',
              visibility: isFirst ? 'hidden' : 'visible'
            }}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className={`btn-3d ${isLast ? 'btn-3d-green' : 'btn-3d-blue'}`}
            style={{ padding: '0.65rem 1.75rem', fontSize: '0.9rem', fontWeight: 900 }}
          >
            {isLast ? 'Let’s Study! 🚀' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

