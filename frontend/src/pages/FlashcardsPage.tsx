import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import type { FlashcardItem, StudyDocument } from '../types';

interface SM2Data {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string;
}

export const FlashcardsPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deck generation form
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [cardCount, setCardCount] = useState<number>(8);

  const fetchData = async () => {
    if (!collectionId) return;
    try {
      setLoading(true);
      const [deckList, docList] = await Promise.all([
        api.listCollectionDecks(collectionId),
        api.listDocuments(collectionId)
      ]);
      setDocuments(docList);
      if (docList.length > 0) {
        setSelectedDocIds([docList[0].id]);
      }

      // Check if custom cards from PDF Reader exist
      const customKey = `recall_custom_cards_${collectionId}`;
      const savedCustom = localStorage.getItem(customKey);
      let customCards: FlashcardItem[] = [];
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          customCards = parsed.map((c: any) => ({
            id: c.id,
            deck_id: 'custom',
            front: c.front,
            back: c.back,
            tags: ['PDF Highlight'],
            created_at: c.created_at
          }));
        } catch {}
      }

      if (deckList.length > 0) {
        const deckData = await api.getFlashcardDeck(deckList[0].id);
        setCards([...(deckData.cards || []), ...customCards]);
      } else if (customCards.length > 0) {
        setCards(customCards);
      }
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load flashcard decks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId || selectedDocIds.length === 0) return;

    try {
      setGenerating(true);
      setError(null);
      const newDeck = await api.generateFlashcards({
        collection_id: collectionId,
        document_ids: selectedDocIds,
        card_count: cardCount
      });
      setCards(newDeck.cards || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowGenerator(false);
      soundManager.playCorrect();
      triggerConfetti();
    } catch (err: any) {
      setError(err.message || 'Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  // SM-2 Spaced Repetition Helpers
  const getCardSM2 = (cardId: string): SM2Data => {
    const saved = localStorage.getItem(`recall_sm2_${cardId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { repetitions: 0, intervalDays: 1, easeFactor: 2.5, nextReviewDate: new Date().toISOString() };
  };

  const isCardDue = (cardId: string): boolean => {
    const sm2 = getCardSM2(cardId);
    return new Date(sm2.nextReviewDate).getTime() <= Date.now() + 60000;
  };

  const handleRateCard = (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;
    const sm2 = getCardSM2(currentCard.id);
    let { repetitions, intervalDays, easeFactor } = sm2;

    if (rating === 1) {
      // Again
      repetitions = 0;
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      soundManager.playWrong();
    } else if (rating === 2) {
      // Hard
      repetitions = Math.max(1, repetitions);
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      soundManager.playCorrect();
    } else if (rating === 3) {
      // Good
      repetitions += 1;
      intervalDays = Math.round(intervalDays * easeFactor);
      soundManager.playCorrect();
    } else if (rating === 4) {
      // Easy
      repetitions += 1;
      intervalDays = Math.round(intervalDays * easeFactor * 1.3);
      easeFactor = Math.min(3.0, easeFactor + 0.15);
      soundManager.playVictory();
    }

    const nextDate = new Date(Date.now() + intervalDays * 86400000).toISOString();
    const updated: SM2Data = { repetitions, intervalDays, easeFactor, nextReviewDate: nextDate };
    localStorage.setItem(`recall_sm2_${currentCard.id}`, JSON.stringify(updated));

    // Proceed to next card
    if (currentIndex < visibleCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFlipped(false);
      triggerConfetti();
      alert('🎉 You have reviewed all cards in this session! Spaced intervals updated.');
    }
  };

  // Visible cards based on due-filter
  const dueCards = cards.filter(c => isCardDue(c.id));
  const visibleCards = filterDueOnly ? dueCards : cards;
  const currentCard = visibleCards[currentIndex];
  const totalCards = visibleCards.length;

  const handleFlip = () => setIsFlipped(prev => !prev);

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, totalCards]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (isFlipped) {
        if (e.key === '1') handleRateCard(1);
        if (e.key === '2') handleRateCard(2);
        if (e.key === '3') handleRateCard(3);
        if (e.key === '4') handleRateCard(4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isFlipped, currentCard]);

  const sm2Data = currentCard ? getCardSM2(currentCard.id) : null;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to={`/collections/${collectionId}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
            ← Back to Collection
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Spaced Repetition Study Cards 🧠
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Powered by SuperMemo SM-2 algorithm: automatically spaces reviews based on memory stability.
          </p>
        </div>

        {cards.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
              onClick={() => setShowGenerator(prev => !prev)}
            >
              {showGenerator ? '✕ Close' : '➕ New Deck'}
            </button>
            <button
              className={`btn-3d ${filterDueOnly ? 'btn-3d-gold' : 'btn-3d-white'}`}
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
              onClick={() => {
                setFilterDueOnly(prev => !prev);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              ⚡ Due Today ({dueCards.length})
            </button>
            <button
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
              onClick={handleShuffle}
              title="Randomize card order"
            >
              🔀 Shuffle
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {/* Main Flashcard Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading your study cards and SM-2 schedules...
        </div>
      ) : showGenerator || cards.length === 0 ? (
        /* Deck Generation Card */
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Generate Smart Flashcards
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            Extract high-yield active recall flashcards from your uploaded lecture notes.
          </p>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Select Source Document
              </label>
              <select
                className="select-input"
                value={selectedDocIds[0] || ''}
                onChange={e => setSelectedDocIds([e.target.value])}
                required
              >
                {documents.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.filename} ({d.total_pages} {d.total_pages === 1 ? 'page' : 'pages'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Number of Cards
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[5, 8, 12, 16, 20].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    className={`btn-3d ${cardCount === cnt ? 'btn-3d-blue' : 'btn-3d-white'}`}
                    style={{ flex: 1, padding: '0.4rem' }}
                    onClick={() => setCardCount(cnt)}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-3d btn-3d-green"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
              disabled={generating}
            >
              {generating ? 'Analyzing concepts & synthesizing flashcards...' : '⚡ Generate Flashcard Deck'}
            </button>
          </form>
        </div>
      ) : totalCards === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>All Caught Up!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            No flashcards are due for review today under your spaced repetition schedule.
          </p>
          <button className="btn-3d btn-3d-white" onClick={() => setFilterDueOnly(false)}>
            Review All Cards ({cards.length})
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Progress & SM-2 Stability Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Card {currentIndex + 1} of {totalCards} {filterDueOnly && '(Due Today)'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-mode">
                Interval: {sm2Data?.intervalDays || 1}d
              </span>
              <span className="badge badge-xp">
                Ease: {(sm2Data?.easeFactor || 2.5).toFixed(1)}x
              </span>
            </div>
          </div>

          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }} />
          </div>

          {/* Flashcard Box with 3D Flip */}
          <div
            onClick={handleFlip}
            className="card"
            style={{
              minHeight: '280px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2.5rem 2rem',
              background: 'var(--color-surface)',
              border: isFlipped ? '2px solid var(--color-blue)' : '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
              textAlign: 'center'
            }}
          >
            {/* Top Card Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-mode">
                {isFlipped ? 'EXPLANATION & EVIDENCE' : 'PROMPT / ACTIVE RECALL'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                Click or press Space to flip ↺
              </span>
            </div>

            {/* Middle Card Content */}
            <div style={{ padding: '1.5rem 0' }}>
              {!isFlipped ? (
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.4, color: 'var(--color-text-main)', margin: 0 }}>
                    {currentCard.front}
                  </h2>
                  {currentCard.tags?.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                      {currentCard.tags.map(t => (
                        <span key={t} className="badge" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--color-text-main)', marginBottom: '1rem', marginTop: 0 }}>
                    {currentCard.back}
                  </p>
                  {currentCard.source_quote && (
                    <div style={{
                      background: 'var(--color-bg)',
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                      borderLeft: '3px solid var(--color-blue)'
                    }}>
                      "{currentCard.source_quote}"
                      {currentCard.source_page && <strong> — Page {currentCard.source_page}</strong>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hint message on front */}
            {!isFlipped && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Try recalling the definition before revealing the back!
              </div>
            )}
          </div>

          {/* SM-2 Rating Bar (Revealed when card is flipped) */}
          {isFlipped ? (
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Rate Recall Difficulty (SM-2 Interval)
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
                  Hotkeys: 1, 2, 3, 4
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                <button
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.6rem 0.25rem', borderBottom: '3px solid var(--color-error)' }}
                  onClick={() => handleRateCard(1)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-error)' }}>🔄 Again</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1 day</div>
                </button>

                <button
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.6rem 0.25rem', borderBottom: '3px solid var(--color-gold)' }}
                  onClick={() => handleRateCard(2)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-gold-dark)' }}>⚡ Hard</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{Math.max(1, Math.round((sm2Data?.intervalDays || 1) * 1.2))}d</div>
                </button>

                <button
                  className="btn-3d btn-3d-green"
                  style={{ padding: '0.6rem 0.25rem' }}
                  onClick={() => handleRateCard(3)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>👍 Good</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{Math.round((sm2Data?.intervalDays || 1) * (sm2Data?.easeFactor || 2.5))}d</div>
                </button>

                <button
                  className="btn-3d btn-3d-blue"
                  style={{ padding: '0.6rem 0.25rem' }}
                  onClick={() => handleRateCard(4)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>🌟 Easy</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{Math.round((sm2Data?.intervalDays || 1) * (sm2Data?.easeFactor || 2.5) * 1.3)}d</div>
                </button>
              </div>
            </div>
          ) : (
            /* Navigation Controls when un-flipped */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn-3d btn-3d-white"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                ← Previous
              </button>
              <button
                className="btn-3d btn-3d-blue"
                onClick={handleFlip}
              >
                Flip to Review Answer ↺
              </button>
              <button
                className="btn-3d btn-3d-white"
                onClick={handleNext}
                disabled={currentIndex === totalCards - 1}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
