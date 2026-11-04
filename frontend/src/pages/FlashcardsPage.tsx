import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { FlashcardItem, StudyDocument } from '../types';

export const FlashcardsPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
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
      if (deckList.length > 0) {
        loadDeck(deckList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load flashcard decks');
    } finally {
      setLoading(false);
    }
  };

  const loadDeck = async (deckId: string) => {
    try {
      setLoading(true);
      const deckData = await api.getFlashcardDeck(deckId);
      setCards(deckData.cards || []);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load deck');
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
    } catch (err: any) {
      setError(err.message || 'Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

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

  const toggleMastered = (cardId: string) => {
    setMasteredIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleShuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Keyboard navigation: Space to flip, Left/Right arrows
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to={`/collections/${collectionId}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
            ← Back to Collection
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Interactive Study Cards
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Active recall flashcards extracted from your learning materials.
          </p>
        </div>

        {cards.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
              onClick={() => setShowGenerator(prev => !prev)}
            >
              {showGenerator ? '✕ Close Generator' : '➕ New Deck'}
            </button>
            <button
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
              onClick={handleShuffle}
              title="Randomize card order"
            >
              🔀 Shuffle
            </button>
            <button
              className="btn-3d btn-3d-green"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
              onClick={() => navigate(`/collections/${collectionId}/quiz-setup`)}
            >
              ⚡ Test with Quiz
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
          Loading your study cards...
        </div>
      ) : showGenerator || cards.length === 0 ? (
        /* Deck Generation Card */
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Generate Study Cards from Material
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Extract key principles, definitions, and relationships into bite-sized study cards.
          </p>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Select Source Document(s)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {documents.map(d => {
                  const isSelected = selectedDocIds.includes(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDocIds(prev =>
                        prev.includes(d.id)
                          ? (prev.length > 1 ? prev.filter(id => id !== d.id) : prev)
                          : [...prev, d.id]
                      )}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.filename}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Number of Cards: {cardCount}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[5, 8, 12, 16].map(count => (
                  <button
                    type="button"
                    key={count}
                    onClick={() => setCardCount(count)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      border: `1.5px solid ${cardCount === count ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: cardCount === count ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer'
                    }}
                  >
                    {count} Cards
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
              disabled={generating || documents.length === 0}
            >
              {generating ? 'Synthesizing concept cards...' : '🗂️ Generate Flashcard Deck'}
            </button>
          </form>
        </div>
      ) : currentCard ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Progress Indicator */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Card {currentIndex + 1} of {totalCards}
              </span>
              <span className="badge badge-xp">
                ★ {masteredIds.size} Mastered
              </span>
            </div>
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard Box with Flip */}
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
              background: isFlipped ? 'var(--color-surface)' : 'var(--color-surface)',
              border: isFlipped ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
              textAlign: 'center'
            }}
          >
            {/* Top Card Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-mode">
                {isFlipped ? 'EXPLANATION & EVIDENCE' : 'PROMPT / CONCEPT'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                Click or press Space to flip ↺
              </span>
            </div>

            {/* Middle Card Content */}
            <div style={{ padding: '1.5rem 0' }}>
              {!isFlipped ? (
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.4, color: 'var(--color-text-main)' }}>
                    {currentCard.front}
                  </h2>
                  {currentCard.tags.length > 0 && (
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
                  <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
                    {currentCard.back}
                  </p>
                  {currentCard.source_quote && (
                    <div style={{
                      background: 'var(--color-bg)',
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                      borderLeft: '3px solid var(--color-primary)'
                    }}>
                      "{currentCard.source_quote}"
                      {currentCard.source_page && <strong> — Page {currentCard.source_page}</strong>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom State */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMastered(currentCard.id);
                }}
                className={`btn ${masteredIds.has(currentCard.id) ? 'btn-success' : 'btn-secondary'}`}
                style={{ fontSize: '0.8125rem' }}
              >
                {masteredIds.has(currentCard.id) ? '✓ Mastered' : 'Mark as Mastered'}
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn-3d btn-3d-white"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Use arrow keys ← →
            </span>
            <button
              className="btn-3d btn-3d-blue"
              onClick={handleNext}
              disabled={currentIndex === totalCards - 1}
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
