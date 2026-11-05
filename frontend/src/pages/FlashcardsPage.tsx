import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { FlashcardDeck, FlashcardItem, StudyDocument } from '../types';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { questService } from '../services/quests';

interface SM2Data {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string;
}

export const FlashcardsPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deck generation form: Slide set selection
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [startSlide, setStartSlide] = useState<number>(1);
  const [endSlide, setEndSlide] = useState<number>(8);
  const [density, setDensity] = useState<'single' | 'double' | 'summary'>('single');

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];
  const docTotalPages = selectedDoc?.total_pages || 10;

  const fetchData = async () => {
    if (!collectionId) return;
    try {
      setLoading(true);
      const [deckList, docList] = await Promise.all([
        api.listCollectionDecks(collectionId),
        api.listDocuments(collectionId)
      ]);
      setDocuments(docList);
      setDecks(deckList);

      if (docList.length > 0) {
        setSelectedDocId(docList[0].id);
        const pages = docList[0].total_pages || 10;
        setStartSlide(1);
        setEndSlide(Math.min(8, pages));
      }

      // Check if custom cards from highlights exist
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
            source_page: c.source_page || 1,
            tags: ['User Card'],
            created_at: c.created_at
          }));
        } catch {}
      }

      let allCards: FlashcardItem[] = [...customCards];
      for (const d of deckList) {
        try {
          const fullDeck = await api.getFlashcardDeck(d.id);
          if (fullDeck.cards) {
            allCards = [...allCards, ...fullDeck.cards];
          }
        } catch {}
      }

      setCards(allCards);
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

  // Adjust default end slide when selected doc changes
  useEffect(() => {
    if (selectedDoc) {
      const pages = selectedDoc.total_pages || 10;
      setStartSlide(1);
      setEndSlide(Math.min(8, pages));
    }
  }, [selectedDocId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId || !selectedDocId) return;

    try {
      setGenerating(true);
      setError(null);

      const span = Math.max(1, endSlide - startSlide + 1);
      const count = density === 'double' ? span * 2 : density === 'summary' ? Math.min(6, span) : span;
      const deckTitle = `Flashcards: Slides ${startSlide}–${endSlide}`;

      const newDeck = await api.generateFlashcards({
        collection_id: collectionId,
        document_ids: [selectedDocId],
        title: deckTitle,
        start_slide: startSlide,
        end_slide: endSlide,
        card_count: Math.min(30, Math.max(2, count))
      });

      const freshCards = newDeck.cards || [];
      setDecks(prev => [newDeck, ...prev]);
      setCards(prev => [...freshCards, ...prev]);
      setSelectedDeckId(newDeck.id);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowGenerator(false);
      soundManager.playVictory();
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

  // Filter cards by selected deck and due status
  const displayedCards = cards.filter(c => {
    if (selectedDeckId !== 'all' && c.deck_id !== selectedDeckId) {
      return false;
    }
    if (filterDueOnly) {
      const sm2 = getCardSM2(c.id);
      return new Date(sm2.nextReviewDate).getTime() <= Date.now();
    }
    return true;
  });

  const dueCards = cards.filter(c => {
    const sm2 = getCardSM2(c.id);
    return new Date(sm2.nextReviewDate).getTime() <= Date.now();
  });

  const totalCards = displayedCards.length;
  const currentCard = displayedCards[currentIndex];
  const sm2Data = currentCard ? getCardSM2(currentCard.id) : null;

  const handleFlip = () => {
    soundManager.playTick();
    setIsFlipped(prev => !prev);
  };

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleRateCard = (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;
    const sm2 = getCardSM2(currentCard.id);
    let { repetitions, intervalDays, easeFactor } = sm2;

    if (rating === 1) {
      repetitions = 0;
      intervalDays = 1;
      soundManager.playWrong();
    } else if (rating === 2) {
      repetitions += 1;
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      soundManager.playCorrect();
    } else if (rating === 3) {
      repetitions += 1;
      intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(intervalDays * easeFactor);
      soundManager.playCorrect();
    } else if (rating === 4) {
      repetitions += 1;
      intervalDays = repetitions === 1 ? 2 : repetitions === 2 ? 8 : Math.round(intervalDays * easeFactor * 1.3);
      easeFactor = Math.min(3.0, easeFactor + 0.15);
      soundManager.playVictory();
    }

    const nextDate = new Date(Date.now() + intervalDays * 86400000).toISOString();
    const updated: SM2Data = { repetitions, intervalDays, easeFactor, nextReviewDate: nextDate };
    localStorage.setItem(`recall_sm2_${currentCard.id}`, JSON.stringify(updated));

    // Record quest progress
    questService.recordProgress('flashcard_review', 1);

    if (currentIndex < totalCards - 1) {
      handleNext();
    } else {
      triggerConfetti();
      alert('🎉 Awesome! You have completed all study cards in this slide set!');
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    soundManager.playTick();
  };

  // Generate suggested slide chunk sets for quick 1-click selection
  const generatePresetChunks = (totalPages: number) => {
    const chunks: { label: string; start: number; end: number }[] = [];
    const chunkSize = 8;
    for (let i = 1; i <= totalPages; i += chunkSize) {
      const end = Math.min(totalPages, i + chunkSize - 1);
      chunks.push({ label: `Slides ${i}–${end}`, start: i, end });
    }
    return chunks;
  };

  const presetChunks = generatePresetChunks(docTotalPages);

  return (
    <div style={{ maxWidth: '740px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to={`/collections/${collectionId}`} style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
            ← Back to Collection
          </Link>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, marginTop: '0.25rem' }}>
            Spaced Repetition Flashcards 🧠
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Slide-by-slide active recall powered by SuperMemo SM-2 memory intervals.
          </p>
        </div>

        {cards.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn-3d btn-3d-green"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
              onClick={() => setShowGenerator(prev => !prev)}
            >
              {showGenerator ? '✕ Close' : '➕ Add Slide Set'}
            </button>
            <button
              className={`btn-3d ${filterDueOnly ? 'btn-3d-gold' : 'btn-3d-white'}`}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
              onClick={() => {
                setFilterDueOnly(prev => !prev);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              ⚡ Due ({dueCards.length})
            </button>
            <button
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
              onClick={handleShuffle}
              title="Randomize card order"
            >
              🔀 Shuffle
            </button>
          </div>
        )}
      </div>

      {/* Deck & Slide Set Selector Tabs */}
      {decks.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '0.35rem',
          borderBottom: '1.5px solid var(--color-border)'
        }}>
          <button
            type="button"
            onClick={() => { setSelectedDeckId('all'); setCurrentIndex(0); setIsFlipped(false); }}
            className={`btn-3d ${selectedDeckId === 'all' ? 'btn-3d-blue' : 'btn-3d-white'}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
          >
            All Decks ({cards.length})
          </button>
          {decks.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setSelectedDeckId(d.id); setCurrentIndex(0); setIsFlipped(false); }}
              className={`btn-3d ${selectedDeckId === d.id ? 'btn-3d-blue' : 'btn-3d-white'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
            >
              📁 {d.title.replace('Flashcards: ', '')}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {/* Main Flashcard Display or Deck Generator */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading your study cards and SM-2 schedules...
        </div>
      ) : showGenerator || cards.length === 0 ? (
        /* Deck Generation Card with Slide Set Selection */
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📑</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
              Generate Flashcards per Set of Slides
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Select your source document and specify which set of slides you want to study today.
          </p>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Document Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                1. Select Document ({documents.length} available)
              </label>
              <select
                className="select-input"
                value={selectedDocId}
                onChange={e => setSelectedDocId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontWeight: 700
                }}
              >
                {documents.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.filename} • {d.total_pages} {d.total_pages === 1 ? 'slide' : 'slides'}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Slide Set Quick Presets */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                2. Choose Slide Set Range ({docTotalPages} total slides)
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {presetChunks.map(chunk => {
                  const isSelected = startSlide === chunk.start && endSlide === chunk.end;
                  return (
                    <button
                      key={chunk.label}
                      type="button"
                      onClick={() => {
                        setStartSlide(chunk.start);
                        setEndSlide(chunk.end);
                      }}
                      className={`btn-3d ${isSelected ? 'btn-3d-blue' : 'btn-3d-white'}`}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      {chunk.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setStartSlide(1);
                    setEndSlide(docTotalPages);
                  }}
                  className={`btn-3d ${startSlide === 1 && endSlide === docTotalPages ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  All Slides (1–{docTotalPages})
                </button>
              </div>

              {/* Custom Range Inputs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'var(--color-surface-hover)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border)'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  Custom Range:
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>From Slide</span>
                <input
                  type="number"
                  min={1}
                  max={docTotalPages}
                  value={startSlide}
                  onChange={e => setStartSlide(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '65px',
                    padding: '0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'center',
                    fontWeight: 800
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>to Slide</span>
                <input
                  type="number"
                  min={startSlide}
                  max={docTotalPages}
                  value={endSlide}
                  onChange={e => setEndSlide(Math.min(docTotalPages, Math.max(startSlide, parseInt(e.target.value) || startSlide)))}
                  style={{
                    width: '65px',
                    padding: '0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'center',
                    fontWeight: 800
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 800, marginLeft: 'auto' }}>
                  ({Math.max(1, endSlide - startSlide + 1)} slides selected)
                </span>
              </div>
            </div>

            {/* 3. Card Density per Slide */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                3. Flashcard Density
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDensity('single')}
                  className={`btn-3d ${density === 'single' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ padding: '0.55rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.15rem' }}
                >
                  <span style={{ fontWeight: 800 }}>Standard</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>~1 Card per Slide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('double')}
                  className={`btn-3d ${density === 'double' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ padding: '0.55rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.15rem' }}
                >
                  <span style={{ fontWeight: 800 }}>Comprehensive</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>~2 Cards per Slide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('summary')}
                  className={`btn-3d ${density === 'summary' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ padding: '0.55rem', fontSize: '0.8rem', flexDirection: 'column', gap: '0.15rem' }}
                >
                  <span style={{ fontWeight: 800 }}>Key Summary</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>5 Core Concepts</span>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="btn-3d btn-3d-green"
              style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
              disabled={generating}
            >
              {generating
                ? `Synthesizing cards for Slides ${startSlide}–${endSlide}...`
                : `⚡ Generate Flashcards for Slides ${startSlide}–${endSlide}`}
            </button>
          </form>
        </div>
      ) : totalCards === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>All Caught Up!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            No flashcards are due for review under your spaced repetition schedule.
          </p>
          <button className="btn-3d btn-3d-white" onClick={() => setFilterDueOnly(false)}>
            Review All Cards ({cards.length})
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Progress & Deck Information */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Card {currentIndex + 1} of {totalCards}
            </span>
            <span style={{ color: 'var(--color-blue)' }}>
              Interval: {sm2Data?.intervalDays || 1}d (Ease {sm2Data?.easeFactor.toFixed(1) || '2.5'})
            </span>
          </div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{ width: `${Math.round(((currentIndex + 1) / totalCards) * 100)}%` }}
            />
          </div>

          {/* Interactive 3D Study Card */}
          <div
            onClick={handleFlip}
            className="card"
            style={{
              minHeight: '260px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: isFlipped ? '2px solid var(--color-blue)' : '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
              textAlign: 'center'
            }}
          >
            {/* Top Card Badge with Slide Number */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-mode">
                  {isFlipped ? 'EXPLANATION & EVIDENCE' : 'PROMPT / ACTIVE RECALL'}
                </span>
                {currentCard.source_page && (
                  <span className="badge" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-blue)', fontWeight: 800 }}>
                    📍 Slide {currentCard.source_page}
                  </span>
                )}
              </div>
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
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
                      {currentCard.source_page && <strong> — Slide {currentCard.source_page}</strong>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hint message on front */}
            {!isFlipped && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Try recalling the concept from memory before flipping!
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
                  style={{ padding: '0.6rem 0.25rem' }}
                  onClick={() => handleRateCard(1)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-error)' }}>🔄 Again</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1 day</div>
                </button>
                <button
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.6rem 0.25rem' }}
                  onClick={() => handleRateCard(2)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-gold-dark)' }}>⚡ Hard</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{Math.max(1, Math.round((sm2Data?.intervalDays || 1) * 1.2))}d</div>
                </button>
                <button
                  className="btn-3d btn-3d-blue"
                  style={{ padding: '0.6rem 0.25rem' }}
                  onClick={() => handleRateCard(3)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>👍 Good</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{Math.round((sm2Data?.intervalDays || 1) * (sm2Data?.easeFactor || 2.5))}d</div>
                </button>
                <button
                  className="btn-3d btn-3d-green"
                  style={{ padding: '0.6rem 0.25rem' }}
                  onClick={() => handleRateCard(4)}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>🌟 Easy</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{Math.round((sm2Data?.intervalDays || 1) * (sm2Data?.easeFactor || 2.5) * 1.3)}d</div>
                </button>
              </div>
            </div>
          ) : (
            /* Navigation Bar */
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
              <button
                className="btn-3d btn-3d-white"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{ flex: '1 1 auto', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                ← Prev
              </button>
              <button
                className="btn-3d btn-3d-blue"
                onClick={handleFlip}
                style={{ flex: '2 1 auto', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              >
                Flip ↺
              </button>
              <button
                className="btn-3d btn-3d-white"
                onClick={handleNext}
                disabled={currentIndex === totalCards - 1}
                style={{ flex: '1 1 auto', fontSize: '0.8rem', padding: '0.5rem' }}
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
