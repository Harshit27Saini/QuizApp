import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { companionService } from '../services/companions';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { questService } from '../services/quests';

interface MicroTask {
  type: 'flashcard' | 'reading' | 'breather';
  title: string;
  subtitle: string;
  data: any;
}

export const JustStartPage: React.FC = () => {
  const navigate = useNavigate();
  const companion = companionService.getActiveCompanion();
  const avatarUrl = companionService.getAvatarUrl(companion);

  // 5-Minute Timer state (300 seconds)
  const INITIAL_SECONDS = 300;
  const [secondsLeft, setSecondsLeft] = useState<number>(INITIAL_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [ambientSound, setAmbientSound] = useState<'off' | 'rain' | 'drone'>('off');

  // Task & Content State
  const [loading, setLoading] = useState<boolean>(true);
  const [task, setTask] = useState<MicroTask | null>(null);
  const [isExtraSmall, setIsExtraSmall] = useState<boolean>(false);
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);
  const [breatherPhase, setBreatherPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  // Victory / Completion modal
  const [showFinished, setShowFinished] = useState<boolean>(false);

  // Timer interval ref
  const timerRef = useRef<any>(null);
  const breatherRef = useRef<any>(null);

  // Load user content to pick one tiny task
  useEffect(() => {
    const pickMicroTask = async () => {
      try {
        setLoading(true);
        const collections = await api.listCollections();

        if (collections.length > 0) {
          // Check for decks or documents
          const coll = collections[0];
          const [decks, docs] = await Promise.all([
            api.listCollectionDecks(coll.id).catch(() => []),
            api.listDocuments(coll.id).catch(() => [])
          ]);

          if (decks.length > 0) {
            const deck = await api.getFlashcardDeck(decks[0].id);
            if (deck.cards && deck.cards.length > 0) {
              setTask({
                type: 'flashcard',
                title: 'Flip Just 3 Flashcards',
                subtitle: 'Zero pressure. Read the prompt, flip, and you are done.',
                data: deck.cards.slice(0, 3)
              });
              setLoading(false);
              return;
            }
          }

          if (docs.length > 0) {
            const preview = await api.getDocumentPreview(docs[0].id);
            if (preview.sections && preview.sections.length > 0) {
              const sec = preview.sections[0];
              setTask({
                type: 'reading',
                title: 'Read Just This 1 Short Section',
                subtitle: `From ${docs[0].filename} • 1 minute read`,
                data: {
                  heading: sec.heading || 'Key Lecture Concept',
                  content: sec.content.slice(0, 450) + (sec.content.length > 450 ? '...' : '')
                }
              });
              setLoading(false);
              return;
            }
          }
        }

        // Fallback default calming micro-task
        setTask({
          type: 'flashcard',
          title: '3 Low-Stress Active Recall Cards',
          subtitle: 'Gentle warmup to get your momentum rolling.',
          data: [
            { id: '1', front: 'What is the "5-Minute Rule" for overcoming procrastination?', back: 'Tell yourself you will only do the task for 5 minutes. If you still want to stop, you can quit guilt-free!' },
            { id: '2', front: 'Why does starting feel so much harder than continuing?', back: 'Activation energy! The brain experiences friction starting a task, but once initiated, dopamine & momentum take over.' },
            { id: '3', front: 'What is the most effective study strategy for ADHD minds?', back: 'Micro-bursts with zero distraction, bite-sized active recall, and celebratory completion checkpoints.' }
          ]
        });
      } catch {
        // Safe fallback
        setTask({
          type: 'breather',
          title: '60-Second Mindful Breather',
          subtitle: 'Clear the mental fog before we do anything else.',
          data: {}
        });
      } finally {
        setLoading(false);
      }
    };

    pickMicroTask();
  }, []);

  // 5-Minute Timer countdown
  useEffect(() => {
    if (!isTimerRunning) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Breather animation cycle (4s Inhale, 4s Hold, 4s Exhale)
  useEffect(() => {
    if (task?.type !== 'breather') return;
    const phases: Array<'Inhale' | 'Hold' | 'Exhale'> = ['Inhale', 'Hold', 'Exhale'];
    let idx = 0;
    breatherRef.current = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setBreatherPhase(phases[idx]);
    }, 4000);

    return () => {
      if (breatherRef.current) clearInterval(breatherRef.current);
    };
  }, [task?.type]);

  // Ambient sound handler
  const handleToggleAmbient = (type: 'rain' | 'drone') => {
    if (ambientSound === type) {
      soundManager.stopFocusAmbient();
      setAmbientSound('off');
    } else {
      soundManager.startFocusAmbient(type);
      setAmbientSound(type);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      soundManager.stopFocusAmbient();
    };
  }, []);

  // Make it smaller button (ADHD Golden Rule)
  const handleMakeSmaller = () => {
    setIsExtraSmall(true);
    soundManager.playCorrect();
    if (task?.type === 'flashcard' && task.data.length > 1) {
      setTask({
        ...task,
        title: 'Just 1 Single Card (Maximum Small)',
        subtitle: 'Read one fact. Flip. That is 100% of the mission.',
        data: [task.data[0]]
      });
    } else if (task?.type === 'reading') {
      setTask({
        ...task,
        title: 'Just 2 Sentences (Maximum Small)',
        subtitle: 'Read these 2 lines and you are totally done.',
        data: {
          ...task.data,
          content: task.data.content.split('. ').slice(0, 2).join('. ') + '.'
        }
      });
    }
  };

  const handleFinishSession = () => {
    setIsTimerRunning(false);
    soundManager.stopFocusAmbient();
    soundManager.playVictory();
    triggerConfetti();
    questService.recordProgress('read_pages', 1);
    setShowFinished(true);
  };

  const handleAddTime = (minutes: number) => {
    setSecondsLeft(prev => prev + minutes * 60);
    setIsTimerRunning(true);
    setShowFinished(false);
    soundManager.playCorrect();
  };

  // Timer formatting
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progressRatio = (INITIAL_SECONDS - secondsLeft) / INITIAL_SECONDS;
  const strokeDashoffset = 2 * Math.PI * 30 * (1 - progressRatio);

  const activeCards = task?.type === 'flashcard' ? task.data : [];
  const currentCard = activeCards[cardIndex];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '80vh' }}>
      {/* Top Banner: Zen Mode & Companion Assurance */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(206, 130, 255, 0.15) 0%, rgba(28, 176, 246, 0.12) 100%)',
        border: '2px solid rgba(206, 130, 255, 0.35)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--color-purple)',
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            flexShrink: 0
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={companion.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              companion.avatarIcon
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-purple-dark)' }}>{companion.name}</span>
              <span className="badge" style={{ background: '#ce82ff', color: '#fff', fontSize: '0.65rem' }}>JUST START MODE</span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-main)', fontStyle: 'italic', lineHeight: 1.3 }}>
              "No pressure at all. Just 5 minutes. If you want to stop after this, you've still won today! ⭐"
            </p>
          </div>
        </div>

        <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
          ✕ Exit
        </Link>
      </div>

      {/* 5-Minute Timer & Ambient Audio Strip */}
      <div className="card" style={{
        padding: '1.25rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)'
      }}>
        {/* Circular Timer Ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '70px', height: '70px' }}>
            <svg width="70" height="70" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="35"
                cy="35"
                r="30"
                stroke="var(--color-border)"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="35"
                cy="35"
                r="30"
                stroke="var(--color-purple)"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 900,
              fontFamily: 'monospace'
            }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              5-Minute Gentle Timer
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button
                className="btn-3d btn-3d-white"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setIsTimerRunning(prev => !prev)}
              >
                {isTimerRunning ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button
                className="btn-3d btn-3d-white"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setSecondsLeft(prev => prev + 120)}
              >
                +2 Mins
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Calming Audio Generator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Ambient:</span>
          <button
            className={`btn-3d ${ambientSound === 'rain' ? 'btn-3d-blue' : 'btn-3d-white'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            onClick={() => handleToggleAmbient('rain')}
            title="Calming synthesized pink noise rain"
          >
            🌧️ Rain
          </button>
          <button
            className={`btn-3d ${ambientSound === 'drone' ? 'btn-3d-purple' : 'btn-3d-white'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            onClick={() => handleToggleAmbient('drone')}
            title="Warm lo-fi two-tone focus hum"
          >
            🎵 Lo-Fi
          </button>
        </div>
      </div>

      {/* The Single Tiny Task Container */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Preparing your low-stress micro-task...
        </div>
      ) : task ? (
        <div className="card" style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderRadius: 'var(--radius-xl)',
          border: '2px solid var(--color-border)',
          background: 'var(--color-surface)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
        }}>
          {/* Header & Make Smaller Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(88, 204, 2, 0.15)', color: 'var(--color-green)', fontWeight: 800, fontSize: '0.7rem' }}>
                SINGLE MICRO-TASK
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0.25rem 0 0 0' }}>
                {task.title}
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {task.subtitle}
              </p>
            </div>

            {!isExtraSmall && task.type !== 'breather' && (
              <button
                className="btn-3d btn-3d-gold"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                onClick={handleMakeSmaller}
                title="If this feels like too much, drop it to the absolute minimum"
              >
                🤏 Make it smaller
              </button>
            )}
          </div>

          {/* TASK 1: MICRO FLASHCARD FLIP */}
          {task.type === 'flashcard' && currentCard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                Card {cardIndex + 1} of {activeCards.length}
              </div>

              <div
                onClick={() => setCardFlipped(prev => !prev)}
                style={{
                  minHeight: '180px',
                  padding: '1.75rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-bg)',
                  border: cardFlipped ? '2px solid var(--color-blue)' : '2px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-subtle)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  {cardFlipped ? 'Explanation / Key Fact' : 'Prompt (Click or tap to flip)'}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.4, color: 'var(--color-text-main)' }}>
                  {cardFlipped ? currentCard.back : currentCard.front}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                  onClick={() => setCardFlipped(prev => !prev)}
                >
                  {cardFlipped ? 'Show Front ↺' : 'Flip to Reveal ↺'}
                </button>

                <button
                  className="btn-3d btn-3d-green"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    soundManager.playCorrect();
                    if (cardIndex < activeCards.length - 1) {
                      setCardIndex(prev => prev + 1);
                      setCardFlipped(false);
                    } else {
                      handleFinishSession();
                    }
                  }}
                >
                  {cardIndex < activeCards.length - 1 ? 'Next Card →' : 'Done with Micro-Task ✓'}
                </button>
              </div>
            </div>
          )}

          {/* TASK 2: BITE-SIZED READING */}
          {task.type === 'reading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'var(--color-bg)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'var(--color-text-main)'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-blue-dark)' }}>
                  {task.data.heading}
                </h4>
                <p style={{ margin: 0 }}>
                  {task.data.content}
                </p>
              </div>

              <button
                className="btn-3d btn-3d-green"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                onClick={() => {
                  handleFinishSession();
                }}
              >
                ✓ I Read This Paragraph (Complete!)
              </button>
            </div>
          )}

          {/* TASK 3: BREATHER CIRCLE */}
          {task.type === 'breather' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', gap: '1.5rem' }}>
              <div style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: breatherPhase === 'Inhale' ? 'rgba(28, 176, 246, 0.25)' : breatherPhase === 'Hold' ? 'rgba(206, 130, 255, 0.25)' : 'rgba(88, 204, 2, 0.25)',
                border: `3px solid ${breatherPhase === 'Inhale' ? 'var(--color-blue)' : breatherPhase === 'Hold' ? 'var(--color-purple)' : 'var(--color-green)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                transform: breatherPhase === 'Inhale' ? 'scale(1.2)' : breatherPhase === 'Hold' ? 'scale(1.2)' : 'scale(0.9)',
                transition: 'transform 4s ease-in-out, background 1s ease'
              }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-main)' }}>
                  {breatherPhase}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>4 seconds</span>
              </div>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Follow the rhythm to calm the nervous system. Ready to study?
              </p>

              <button
                className="btn-3d btn-3d-green"
                onClick={() => {
                  handleFinishSession();
                }}
              >
                ✓ Mind Cleared — Complete Checkpoint
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Completion Modal: Zero-Guilt Choice */}
      {showFinished && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '2.25rem 1.75rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            borderRadius: 'var(--radius-xl)',
            border: '4px solid var(--color-green)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '3rem' }}>🎉 ⭐</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
              You Showed Up!
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Breaking inertia is 90% of the battle. You dedicated 5 focused minutes and completed your micro-goal!
            </p>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              background: 'var(--color-bg)',
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              margin: '0.25rem 0'
            }}>
              <span className="badge badge-xp">⚡ +15 XP</span>
              <span className="badge" style={{ background: 'rgba(255, 150, 0, 0.15)', color: 'var(--color-orange-dark)', fontWeight: 800 }}>
                🔥 Streak Intact
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-purple"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                onClick={() => handleAddTime(5)}
              >
                🚀 I'm in the Flow (+5 More Mins)
              </button>

              <button
                className="btn-3d btn-3d-white"
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                onClick={() => navigate('/')}
              >
                🛑 I'm Done for Today (Exit with Pride)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
