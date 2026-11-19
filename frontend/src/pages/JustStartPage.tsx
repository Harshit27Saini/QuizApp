import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { companionService } from '../services/companions';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { questService } from '../services/quests';
import { xpService } from '../services/xp';

interface SlideItem {
  id: string;
  heading: string;
  content: string;
  pageNumber: number;
  question: {
    prompt: string;
    options: { id: string; text: string }[];
    correctId: string;
    explanation: string;
  };
}

export const JustStartPage: React.FC = () => {
  const navigate = useNavigate();
  const companion = companionService.getActiveCompanion();
  const avatarUrl = companionService.getAvatarUrl(companion);

  // 5-Minute Timer state
  const INITIAL_SECONDS = 300;
  const [secondsLeft, setSecondsLeft] = useState<number>(INITIAL_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [ambientSound, setAmbientSound] = useState<'off' | 'rain' | 'drone'>('off');

  // Multi-Slide Stream State
  const [loading, setLoading] = useState<boolean>(true);
  const [docTitle, setDocTitle] = useState<string>('Your Study Material');
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isExtraSmall, setIsExtraSmall] = useState<boolean>(false);

  // Active Question State for Current Slide
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  // Momentum Stats
  const [completedSlides, setCompletedSlides] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [sessionXp, setSessionXp] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  // Completion modal
  const [showFinished, setShowFinished] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  // Load document sections into progressive slide items with generated checks
  useEffect(() => {
    const loadStudyMaterial = async () => {
      try {
        setLoading(true);
        const collections = await api.listCollections();

        if (collections.length > 0) {
          const coll = collections[0];
          const docs = await api.listDocuments(coll.id).catch(() => []);

          if (docs.length > 0) {
            const doc = docs[0];
            setDocTitle(doc.filename);
            const preview = await api.getDocumentPreview(doc.id).catch(() => null);

            if (preview && preview.sections && preview.sections.length > 0) {
              const builtSlides: SlideItem[] = preview.sections.slice(0, 15).map((sec: any, idx: number) => {
                const heading = sec.heading || `Slide ${idx + 1}: Key Concept`;
                const content = sec.content.trim();
                const sentences = content.split('. ').filter((s: string) => s.trim().length > 15);
                const corePoint = sentences[0] || content.slice(0, 100);

                return {
                  id: sec.id || `sec-${idx}`,
                  heading,
                  content: content.slice(0, 420) + (content.length > 420 ? '...' : ''),
                  pageNumber: sec.page_number || idx + 1,
                  question: {
                    prompt: `Quick Recall Check: What is the primary takeaway of ${heading}?`,
                    options: [
                      { id: 'a', text: corePoint },
                      { id: 'b', text: 'This mechanism functions independently without system coordination.' },
                      { id: 'c', text: 'It completely deactivates previous state signals permanently.' },
                      { id: 'd', text: 'It reverses primary directional transport regardless of threshold.' }
                    ],
                    correctId: 'a',
                    explanation: `As detailed on Slide ${sec.page_number || idx + 1}: ${corePoint}`
                  }
                };
              });

              if (builtSlides.length > 0) {
                setSlides(builtSlides);
                setLoading(false);
                return;
              }
            }
          }
        }

        // Resilient fallback momentum slides (Evidence-based learning techniques)
        setDocTitle('High-Yield Study Momentum Sprints');
        setSlides([
          {
            id: 'slide-1',
            heading: 'Overcoming Friction: The 5-Minute Activation Energy Rule',
            content: 'Starting feels exponentially harder than continuing due to cognitive inertia. Once you cross the 5-minute threshold, your brain releases dopamine as progress begins, dramatically lowering task resistance.',
            pageNumber: 1,
            question: {
              prompt: 'Why does starting a study session feel harder than continuing it?',
              options: [
                { id: 'a', text: 'Cognitive inertia requires activation energy, but dopamine takes over once started.' },
                { id: 'b', text: 'Memory consolidation only triggers after 45 minutes of continuous focus.' },
                { id: 'c', text: 'The prefrontal cortex shuts down during task initiation.' },
                { id: 'd', text: 'Visual cues completely override working memory bandwidth.' }
              ],
              correctId: 'a',
              explanation: 'Overcoming the initial inertia is 90% of the battle. Momentum naturally sustains you.'
            }
          },
          {
            id: 'slide-2',
            heading: 'Active Retrieval Beats Passive Re-reading Every Time',
            content: 'Studies prove that testing yourself on a concept produces 3x longer retention than highlighting or re-reading the same notes. The mental effort of retrieving information strengthens synaptic neural pathways.',
            pageNumber: 2,
            question: {
              prompt: 'Which study method produces the highest long-term memory retention?',
              options: [
                { id: 'a', text: 'Active retrieval practice and immediate question self-testing.' },
                { id: 'b', text: 'Multi-color highlighting of textbook margins.' },
                { id: 'c', text: 'Repeated passive re-reading of lecture slides.' },
                { id: 'd', text: 'Listening to lecture recordings while falling asleep.' }
              ],
              correctId: 'a',
              explanation: 'Active retrieval forces neural reconstruction, cementing concepts into permanent memory.'
            }
          },
          {
            id: 'slide-3',
            heading: 'Interleaving: Mixing Concepts for Flexible Mastery',
            content: 'Rather than blocking 3 hours on one topic, interleaving mixes related subtopics. This trains your brain to discriminate between problem types during exams rather than blindly applying one memorized formula.',
            pageNumber: 3,
            question: {
              prompt: 'What is the primary advantage of interleaving related topics?',
              options: [
                { id: 'a', text: 'It trains the brain to recognize and select the right strategy for each problem.' },
                { id: 'b', text: 'It eliminates the need for reviewing previous lecture materials.' },
                { id: 'c', text: 'It reduces total study time by exactly 80%.' },
                { id: 'd', text: 'It bypasses short-term working memory entirely.' }
              ],
              correctId: 'a',
              explanation: 'Interleaving builds discrimination skills so you identify which concept to apply on exams.'
            }
          }
        ]);
      } catch {
        // Safe minimal fallback
      } finally {
        setLoading(false);
      }
    };

    loadStudyMaterial();
  }, []);

  // Timer countdown
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

  useEffect(() => {
    return () => {
      soundManager.stopFocusAmbient();
    };
  }, []);

  const activeSlide = slides[currentSlideIndex] || slides[0];

  // Answer quick recall question
  const handleAnswerQuestion = (optionId: string) => {
    if (isQuestionAnswered || !activeSlide) return;

    setSelectedOptionId(optionId);
    setIsQuestionAnswered(true);
    const passed = optionId === activeSlide.question.correctId;
    setIsCorrect(passed);
    setQuestionsAnswered(prev => prev + 1);

    if (passed) {
      soundManager.playCorrect();
      setStreak(prev => prev + 1);
      setSessionXp(prev => prev + 10);
      xpService.awardXp(10, 'Just Start Recall Check Correct');
    } else {
      soundManager.playWrong();
      setStreak(0);
    }
  };

  // Advance to NEXT SLIDE and question
  const handleNextSlide = () => {
    soundManager.playVictory();
    setCompletedSlides(prev => prev + 1);
    setSessionXp(prev => prev + 15);
    xpService.awardXp(15, 'Slide Completed in Just Start Mode');
    questService.recordProgress('read_pages', 1);

    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsQuestionAnswered(false);
      setIsCorrect(false);
    } else {
      // Finished all slides
      handleFinishSession();
    }
  };

  // Make it smaller toggle (reduces text volume)
  const handleMakeSmaller = () => {
    setIsExtraSmall(true);
    soundManager.playCorrect();
  };

  // Add time and keep stream flowing
  const handleAddTime = (minutes: number) => {
    setSecondsLeft(prev => prev + minutes * 60);
    setIsTimerRunning(true);
    setShowFinished(false);
    soundManager.playCorrect();

    // Advance to next slide if current was completed
    if (isQuestionAnswered && currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsQuestionAnswered(false);
      setIsCorrect(false);
    }
  };

  const handleFinishSession = () => {
    setIsTimerRunning(false);
    soundManager.stopFocusAmbient();
    soundManager.playVictory();
    triggerConfetti();
    xpService.awardXp(25, 'Just Start Session Finished');
    setShowFinished(true);
  };

  // Timer formatting
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progressRatio = (INITIAL_SECONDS - secondsLeft) / INITIAL_SECONDS;
  const strokeDashoffset = 2 * Math.PI * 30 * (1 - Math.min(1, Math.max(0, progressRatio)));

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '85vh', paddingBottom: '3rem' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Companion Motivation Header                                        */}
      {/* ------------------------------------------------------------------ */}
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
              "Zero stress. Take it one slide and one question at a time. Stop whenever you like! ⭐"
            </p>
          </div>
        </div>

        <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
          ✕ Exit
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5-Minute Timer & Ambient Audio Strip                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Ring Timer */}
          <div style={{ position: 'relative', width: '64px', height: '64px' }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="28" stroke="var(--color-border)" strokeWidth="4" fill="transparent" />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="var(--color-purple)"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 28}
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
              fontSize: '0.95rem',
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
                onClick={() => handleAddTime(2)}
                title="Add 2 more peaceful minutes"
              >
                +2 Mins
              </button>
              <button
                className="btn-3d btn-3d-purple"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => handleAddTime(5)}
                title="Add 5 minutes and load fresh slides"
              >
                +5 Mins
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Sounds */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Audio:</span>
          <button
            className={`btn-3d ${ambientSound === 'rain' ? 'btn-3d-blue' : 'btn-3d-white'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            onClick={() => handleToggleAmbient('rain')}
          >
            🌧️ Rain
          </button>
          <button
            className={`btn-3d ${ambientSound === 'drone' ? 'btn-3d-purple' : 'btn-3d-white'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            onClick={() => handleToggleAmbient('drone')}
          >
            🎵 Lo-Fi
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Live Momentum Bar                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--color-bg)',
        padding: '0.625rem 1rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        fontSize: '0.8rem',
        fontWeight: 800,
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>📖 Slide {currentSlideIndex + 1} of {slides.length}</span>
          <span style={{ color: 'var(--color-green)' }}>✓ {completedSlides} Reviewed</span>
          <span style={{ color: 'var(--color-orange-dark)' }}>🔥 {streak} Streak</span>
        </div>
        <div className="badge badge-xp" style={{ fontSize: '0.75rem' }}>
          ⚡ +{sessionXp} XP EARNED
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Active Slide + Quick Recall Question Card                          */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Preparing your low-stress micro-task stream...
        </div>
      ) : activeSlide ? (
        <div className="card" style={{
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderRadius: 'var(--radius-xl)',
          border: '2px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Slide Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-mode" style={{ fontSize: '0.7rem' }}>
                  SLIDE {currentSlideIndex + 1}
                </span>
                <span className="badge" style={{ fontSize: '0.7rem' }}>
                  {docTitle}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0.25rem 0 0 0', color: 'var(--color-text-main)' }}>
                {activeSlide.heading}
              </h2>
            </div>

            {!isExtraSmall && (
              <button
                className="btn-3d btn-3d-gold"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={handleMakeSmaller}
                title="Too much text? Shorten to bare essentials"
              >
                🤏 Make it smaller
              </button>
            )}
          </div>

          {/* Slide Core Content */}
          <div style={{
            background: 'var(--color-bg)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--color-text-main)'
          }}>
            {isExtraSmall
              ? activeSlide.content.split('. ').slice(0, 2).join('. ') + '.'
              : activeSlide.content}
          </div>

          {/* Quick 1-Question Active Recall Check */}
          <div style={{
            marginTop: '0.5rem',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(28, 176, 246, 0.05)',
            border: '1.5px solid var(--color-blue)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-blue-dark)' }}>
                {activeSlide.question.prompt}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activeSlide.question.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isRight = opt.id === activeSlide.question.correctId;

                let optBg = 'var(--color-surface)';
                let optBorder = '1.5px solid var(--color-border)';

                if (isQuestionAnswered) {
                  if (isRight) {
                    optBg = 'rgba(88, 204, 2, 0.15)';
                    optBorder = '2px solid var(--color-green)';
                  } else if (isSelected) {
                    optBg = 'rgba(255, 75, 75, 0.15)';
                    optBorder = '2px solid var(--color-red)';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswerQuestion(opt.id)}
                    disabled={isQuestionAnswered}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: optBg,
                      border: optBorder,
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: isQuestionAnswered ? 'default' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--color-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      {opt.id.toUpperCase()}
                    </span>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                    {isQuestionAnswered && isRight && <span>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Post-answer explanation */}
            {isQuestionAnswered && (
              <div style={{
                background: 'var(--color-surface)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                color: isCorrect ? 'var(--color-green-dark)' : 'var(--color-text-main)',
                borderLeft: `3px solid ${isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`,
                marginTop: '0.25rem'
              }}>
                <strong>{isCorrect ? '🎯 Great recall! ' : '💡 Concept detail: '}</strong>
                {activeSlide.question.explanation}
              </div>
            )}
          </div>

          {/* Advance Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              className="btn-3d btn-3d-white"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              onClick={handleFinishSession}
            >
              🛑 Done for Now (Save XP)
            </button>

            <button
              className="btn-3d btn-3d-green"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}
              onClick={handleNextSlide}
            >
              Next Slide & Question →
            </button>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Session Victory Modal                                              */}
      {/* ------------------------------------------------------------------ */}
      {showFinished && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
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
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '3rem' }}>🎉 ⭐</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
              Sprint Completed!
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Awesome momentum! You reviewed <strong>{completedSlides + 1} slides</strong> and completed <strong>{questionsAnswered} recall checks</strong>.
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
              <span className="badge badge-xp">⚡ +{sessionXp + 25} TOTAL XP</span>
              <span className="badge" style={{ background: 'rgba(255, 150, 0, 0.15)', color: 'var(--color-orange-dark)', fontWeight: 800 }}>
                🔥 Streak Preserved
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-purple"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                onClick={() => handleAddTime(5)}
              >
                🚀 I'm in the Flow (+5 More Mins & Slides)
              </button>

              <button
                className="btn-3d btn-3d-white"
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                onClick={() => navigate('/')}
              >
                🛑 Exit with Pride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
