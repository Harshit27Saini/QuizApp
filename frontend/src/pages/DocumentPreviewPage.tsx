import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { companionService } from '../services/companions';
import { questService } from '../services/quests';
import { xpService } from '../services/xp';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { PetAssistantChat } from '../components/learning_path/PetAssistantChat';
import type { StudyDocument, DocumentSection } from '../types';

interface HighlightItem {
  id: string;
  documentId: string;
  sectionIndex: number;
  pageNumber: number | null;
  text: string;
  color: 'gold' | 'green' | 'blue' | 'purple' | 'coral';
  note?: string;
  createdAt: string;
}

const HIGHLIGHT_COLORS: Record<HighlightItem['color'], { bg: string; border: string; text: string; label: string }> = {
  gold: { bg: 'rgba(255, 217, 0, 0.35)', border: '#ffd900', text: '#ffd900', label: '🟡 Key Fact' },
  green: { bg: 'rgba(88, 204, 2, 0.35)', border: '#58cc02', text: '#58cc02', label: '🟢 Mastered' },
  blue: { bg: 'rgba(28, 176, 246, 0.35)', border: '#1cb0f6', text: '#1cb0f6', label: '🔵 Definition' },
  purple: { bg: 'rgba(206, 130, 255, 0.35)', border: '#ce82ff', text: '#ce82ff', label: '🟣 High-Yield VIP' },
  coral: { bg: 'rgba(255, 75, 75, 0.35)', border: '#ff4b4b', text: '#ff4b4b', label: '🟠 Review Later' }
};

export const DocumentPreviewPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSlide = searchParams.get('slide');

  const [document, setDocument] = useState<StudyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'pdf'>('formatted');

  const [activeTab, setActiveTab] = useState<'pages' | 'highlights' | 'companion'>('pages');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeColor, setActiveColor] = useState<HighlightItem['color']>('gold');

  // Highlights state
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [readPages, setReadPages] = useState<number[]>([]);
  const [selectedText, setSelectedText] = useState<{ text: string; sectionIndex: number; pageNumber: number | null } | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Marginalia / Pinned sticky notes per section (sectionIndex -> note)
  const [pinnedNotes, setPinnedNotes] = useState<Record<number, string>>({});
  const [activePinInputIndex, setActivePinInputIndex] = useState<number | null>(null);
  const [pinDraftText, setPinDraftText] = useState('');

  // Smart Page Summaries (page -> 3 bullets)
  const [pageSummaries, setPageSummaries] = useState<Record<number, { core: string; mechanism: string; examTip: string }>>({});
  const [summarizingPage, setSummarizingPage] = useState<number | null>(null);

  // Flashcard quick modal
  const [flashcardModal, setFlashcardModal] = useState<{ show: boolean; front: string; back: string } | null>(null);
  const [creatingCard, setCreatingCard] = useState(false);

  // Companion state
  const activeCompanion = companionService.getActiveCompanion();
  const avatarUrl = companionService.getAvatarUrl(activeCompanion);
  const [companionCheer, setCompanionCheer] = useState<string>(
    companionService.getRandomCheer(activeCompanion.id)
  );
  const [companionPromptContext, setCompanionPromptContext] = useState<string | undefined>(undefined);

  // Load Document
  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    api.getDocumentPreview(documentId)
      .then(data => {
        setDocument(data);
        // Load saved highlights
        const savedHighlights = localStorage.getItem(`recall_highlights_${documentId}`);
        if (savedHighlights) {
          try { setHighlights(JSON.parse(savedHighlights)); } catch {}
        }
        // Load read pages
        const savedReadPages = localStorage.getItem(`recall_read_pages_${documentId}`);
        if (savedReadPages) {
          try { setReadPages(JSON.parse(savedReadPages)); } catch {}
        }
        // Load pinned notes
        const savedNotes = localStorage.getItem(`recall_notes_${documentId}`);
        if (savedNotes) {
          try { setPinnedNotes(JSON.parse(savedNotes)); } catch {}
        }
      })
      .catch(err => setError(err.message || 'Failed to load document'))
      .finally(() => setLoading(false));
  }, [documentId]);

  // Auto-scroll to slide if linked directly from learning path runner
  useEffect(() => {
    if (!targetSlide || loading) return;
    const timer = setTimeout(() => {
      const el = window.document.getElementById(`page-${targetSlide}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.style.outline = '3px solid var(--color-gold)';
        setTimeout(() => {
          if (el) el.style.outline = 'none';
        }, 3000);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [targetSlide, loading]);

  // Persist highlights
  const saveHighlights = (updated: HighlightItem[]) => {
    setHighlights(updated);
    if (documentId) {
      localStorage.setItem(`recall_highlights_${documentId}`, JSON.stringify(updated));
    }
  };

  // Persist pinned notes
  const savePinnedNotes = (updated: Record<number, string>) => {
    setPinnedNotes(updated);
    if (documentId) {
      localStorage.setItem(`recall_notes_${documentId}`, JSON.stringify(updated));
    }
  };

  // Toggle page read status (+XP reward)
  const togglePageRead = (page: number) => {
    let updated: number[];
    if (readPages.includes(page)) {
      updated = readPages.filter(p => p !== page);
    } else {
      updated = [...readPages, page];
      soundManager.playCorrect();
      questService.recordProgress('read_pages', 1);
      setCompanionCheer(`Awesome job reading Page ${page}! Streak is glowing! ⭐`);
    }
    setReadPages(updated);
    if (documentId) {
      localStorage.setItem(`recall_read_pages_${documentId}`, JSON.stringify(updated));
    }
  };

  // Text selection handler
  const handleMouseUp = (sectionIndex: number, pageNumber: number | null) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText(null);
      setSelectionCoords(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length > 2) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText({ text, sectionIndex, pageNumber });
      setSelectionCoords({
        x: rect.left + rect.width / 2,
        y: rect.top - 12
      });
    } else {
      setSelectedText(null);
      setSelectionCoords(null);
    }
  };

  // Add highlight
  const applyHighlight = (color: HighlightItem['color'], customText?: string) => {
    const textToHighlight = customText || selectedText?.text;
    if (!textToHighlight || !documentId) return;

    const newItem: HighlightItem = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      documentId,
      sectionIndex: selectedText?.sectionIndex ?? 0,
      pageNumber: selectedText?.pageNumber ?? null,
      text: textToHighlight,
      color,
      createdAt: new Date().toISOString()
    };

    const updated = [newItem, ...highlights];
    saveHighlights(updated);
    soundManager.playCorrect();
    setSelectedText(null);
    setSelectionCoords(null);
    setCompanionCheer(`Saved to your high-yield highlights! ${activeCompanion.name} is impressed! 📝`);
  };

  // Delete highlight
  const deleteHighlight = (id: string) => {
    const updated = highlights.filter(h => h.id !== id);
    saveHighlights(updated);
  };

  // Add note to highlight
  const saveNoteToHighlight = (id: string, note: string) => {
    const updated = highlights.map(h => h.id === id ? { ...h, note } : h);
    saveHighlights(updated);
    setEditingNoteId(null);
    setNewNoteInput('');
  };

  // Instant Flashcard Creator
  const openFlashcardModal = (text: string) => {
    setFlashcardModal({
      show: true,
      front: `Key Concept: What is the significance of "${text.slice(0, 40)}..."?`,
      back: text
    });
    setSelectedText(null);
    setSelectionCoords(null);
  };

  const handleSaveFlashcard = async () => {
    if (!flashcardModal || !document?.collection_id) return;
    try {
      setCreatingCard(true);
      // Save locally to collection deck or alert
      const existing = localStorage.getItem(`recall_custom_cards_${document.collection_id}`);
      let customCards: any[] = [];
      if (existing) {
        try { customCards = JSON.parse(existing); } catch {}
      }
      customCards.push({
        id: `card_${Date.now()}`,
        front: flashcardModal.front,
        back: flashcardModal.back,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(`recall_custom_cards_${document.collection_id}`, JSON.stringify(customCards));

      soundManager.playCorrect();
      triggerConfetti();
      xpService.awardXp(10, `Created Flashcard from ${document.filename}`);
      setCompanionCheer(`Flashcard saved to your deck! Active recall mode active! ⚡`);
      setFlashcardModal(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save flashcard');
    } finally {
      setCreatingCard(false);
    }
  };

  // Smart Summarize Page Generator
  const generatePageSummary = (page: number, sections: DocumentSection[]) => {
    if (pageSummaries[page]) {
      // Toggle off
      const next = { ...pageSummaries };
      delete next[page];
      setPageSummaries(next);
      return;
    }

    setSummarizingPage(page);
    setTimeout(() => {
      const combined = sections.map(s => s.content).join(' ');
      const sentences = combined.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);

      const core = sentences[0] || 'Foundational overview of the unit concepts.';
      const mechanism = sentences[1] || 'Key theoretical principles and operational mechanisms.';
      const examTip = sentences[2] || 'High-probability question trigger: verify primary definitions and distinctions.';

      setPageSummaries(prev => ({
        ...prev,
        [page]: { core, mechanism, examTip }
      }));
      setSummarizingPage(null);
      soundManager.playCorrect();
    }, 400);
  };

  // Ask companion about selected text
  const askCompanionAboutText = (text: string) => {
    setCompanionPromptContext(text);
    setActiveTab('companion');
    setSelectedText(null);
    setSelectionCoords(null);
  };

  // Group sections by page
  const pageMap: { [page: number]: DocumentSection[] } = {};
  if (document?.sections) {
    document.sections.forEach(s => {
      const p = s.page_number || 1;
      if (!pageMap[p]) pageMap[p] = [];
      pageMap[p].push(s);
    });
  }
  const pageNumbers = Object.keys(pageMap).map(Number).sort((a, b) => a - b);

  // Filter sections by search query
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const fontSizeMap = {
    sm: { font: '0.875rem', line: '1.5' },
    md: { font: '1rem', line: '1.7' },
    lg: { font: '1.15rem', line: '1.8' }
  };

  // Readiness status per page
  const getPageReadiness = (p: number) => {
    const isRead = readPages.includes(p);
    const hlCount = highlights.filter(h => (h.pageNumber || 1) === p).length;
    if (isRead && hlCount >= 2) return { label: 'Mastered', color: 'var(--color-green)', icon: '🟢' };
    if (isRead || hlCount >= 1) return { label: 'In Review', color: 'var(--color-gold)', icon: '🟡' };
    return { label: 'Unread', color: 'var(--color-text-subtle)', icon: '🔴' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '85vh' }}>
      {/* Top Header & Reader Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.875rem 1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '2px solid var(--color-border)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px' }}>
          {document?.collection_id && (
            <Link
              to={`/collections/${document.collection_id}`}
              className="btn-3d btn-3d-white"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
            >
              ← Back
            </Link>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-mode" style={{ fontSize: '0.7rem' }}>
                {document?.file_type?.toUpperCase() || 'DOC'}
              </span>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>
                {document?.filename || 'Loading Document...'}
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {document?.total_pages || pageNumbers.length} pages • {highlights.length} highlights • {readPages.length} marked read
            </p>
          </div>
        </div>

        {/* Action Journey Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {document && (
            <>
              {document.file_type?.toLowerCase() === 'pdf' && (
                <button
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => setViewMode(prev => prev === 'formatted' ? 'pdf' : 'formatted')}
                >
                  {viewMode === 'formatted' ? '📄 Visual PDF View' : '📝 Section Breakdown'}
                </button>
              )}
              <Link
                to={`/documents/${document.id}/path`}
                className="btn-3d btn-3d-gold"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                🗺️ Learning Path
              </Link>
              <button
                className="btn-3d btn-3d-green"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                onClick={() => navigate(`/collections/${document.collection_id}/quiz-setup?doc=${document.id}`)}
              >
                ⚡ Quiz Me
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📖</div>
          Loading study reader and preparing document analysis...
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : viewMode === 'pdf' && document ? (
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>📄 Visual PDF Reader — Original Layout</span>
            <button
              className="btn-3d btn-3d-white"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              onClick={() => setViewMode('formatted')}
            >
              ← Switch to Interactive Study Sections
            </button>
          </div>
          <iframe
            src={api.getDocumentFileUrl(document.id)}
            style={{ width: '100%', height: '82vh', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}
            title="Visual PDF Viewer"
          />
        </div>
      ) : (
        /* Document Content & Section Preview */
        <div className="reader-grid" style={{
          gap: '1.25rem',
          alignItems: 'start'
        }}>

          {/* Left Rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
              {/* Sidebar Tabs */}
              <div style={{
                display: 'flex',
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.25rem'
              }}>
                <button
                  className={`btn-3d ${activeTab === 'pages' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('pages')}
                >
                  📑 Pages
                </button>
                <button
                  className={`btn-3d ${activeTab === 'highlights' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('highlights')}
                >
                  🖍️ Notes ({highlights.length})
                </button>
                <button
                  className={`btn-3d ${activeTab === 'companion' ? 'btn-3d-blue' : 'btn-3d-white'}`}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('companion')}
                >
                  🐾 Buddy
                </button>
              </div>

              {/* Active Companion Banner Card */}
              <div className="card" style={{
                background: 'var(--color-surface)',
                padding: '0.875rem',
                border: `2px solid ${activeCompanion.badgeColor || 'var(--color-border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={activeCompanion.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${activeCompanion.badgeColor}`
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '2rem' }}>{activeCompanion.avatarIcon}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{activeCompanion.name}</span>
                    <span className="badge" style={{ background: activeCompanion.badgeColor, color: '#fff', fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                      {activeCompanion.badgeText}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.3 }}>
                    "{companionCheer}"
                  </p>
                </div>
              </div>

              {/* TAB CONTENT: PAGES & READINESS HEATMAP */}
              {activeTab === 'pages' && (
                <div className="card" style={{ padding: '0.75rem', maxHeight: '55vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                      Exam Readiness Heatmap
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {readPages.length}/{pageNumbers.length} Read
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {pageNumbers.map(page => {
                      const readiness = getPageReadiness(page);
                      return (
                        <a
                          key={page}
                          href={`#page-${page}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: readiness.label === 'Mastered' ? 'rgba(88, 204, 2, 0.12)' : 'var(--color-bg)',
                            border: `1px solid ${readiness.color}`,
                            color: 'var(--color-text-main)',
                            textDecoration: 'none',
                            fontSize: '0.825rem',
                            fontWeight: 700
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{readiness.icon}</span>
                            <span>Page {page}</span>
                          </div>
                          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--color-surface)', color: readiness.color, fontWeight: 800 }}>
                            {readiness.label}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: HIGHLIGHTS & NOTES */}
              {activeTab === 'highlights' && (
                <div className="card" style={{ padding: '0.75rem', maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                      Saved Notes ({highlights.length})
                    </span>
                    {highlights.length > 0 && (
                      <button
                        className="btn-3d btn-3d-white"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                        onClick={() => {
                          const textExport = highlights.map(h => `[Page ${h.pageNumber || 1}] ${h.text}${h.note ? `\nNote: ${h.note}` : ''}`).join('\n\n');
                          navigator.clipboard.writeText(textExport);
                          alert('All notes copied to clipboard!');
                        }}
                      >
                        📋 Copy All
                      </button>
                    )}
                  </div>

                  {highlights.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      Select any text on the right to highlight key concepts, make flashcards, or add margin notes! 🖍️
                    </div>
                  ) : (
                    highlights.map(hl => (
                      <div
                        key={hl.id}
                        style={{
                          padding: '0.625rem',
                          borderRadius: 'var(--radius-md)',
                          background: HIGHLIGHT_COLORS[hl.color].bg,
                          borderLeft: `4px solid ${HIGHLIGHT_COLORS[hl.color].border}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: HIGHLIGHT_COLORS[hl.color].text }}>
                            {HIGHLIGHT_COLORS[hl.color].label} {hl.pageNumber ? `• Page ${hl.pageNumber}` : ''}
                          </span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              title="Turn into flashcard"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                              onClick={() => openFlashcardModal(hl.text)}
                            >
                              ⚡
                            </button>
                            <button
                              title="Ask companion about this highlight"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                              onClick={() => askCompanionAboutText(hl.text)}
                            >
                              💬
                            </button>
                            <button
                              title="Delete highlight"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
                              onClick={() => deleteHighlight(hl.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-main)', fontStyle: 'italic', lineHeight: 1.4 }}>
                          "{hl.text}"
                        </p>

                        {hl.note ? (
                          <div style={{ fontSize: '0.75rem', background: 'var(--color-surface)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                            <strong>Note:</strong> {hl.note}
                          </div>
                        ) : editingNoteId === hl.id ? (
                          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <input
                              type="text"
                              placeholder="Add note..."
                              value={newNoteInput}
                              onChange={e => setNewNoteInput(e.target.value)}
                              style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            />
                            <button
                              className="btn-3d btn-3d-green"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                              onClick={() => saveNoteToHighlight(hl.id, newNoteInput)}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--color-blue)', padding: 0 }}
                            onClick={() => { setEditingNoteId(hl.id); setNewNoteInput(''); }}
                          >
                            + Add Note
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB CONTENT: COMPANION CHAT */}
              {activeTab === 'companion' && (
                <div className="card" style={{ padding: '0.75rem', maxHeight: '55vh', overflowY: 'auto' }}>
                  <PetAssistantChat
                    currentTopic={document?.filename}
                    contextText={companionPromptContext || "Explain the core concepts and testable facts of this study document."}
                  />
                </div>
              )}
            </div>

          {/* Main Reading Center */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {/* Reading Controls Toolbar */}
            <div className="card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--color-surface)'
            }}>
              {/* Search within document */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-main)',
                    fontSize: '0.85rem'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Highlight Color Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Highlighter:</span>
                {(['gold', 'green', 'blue', 'purple', 'coral'] as const).map(color => (
                  <button
                    key={color}
                    onClick={() => setActiveColor(color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: HIGHLIGHT_COLORS[color].border,
                      border: activeColor === color ? '3px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: activeColor === color ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                      transition: 'transform 0.15s ease'
                    }}
                    title={HIGHLIGHT_COLORS[color].label}
                  />
                ))}
              </div>

              {/* Font Size Adjuster */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {(['sm', 'md', 'lg'] as const).map(size => (
                  <button
                    key={size}
                    className={`btn-3d ${fontSize === size ? 'btn-3d-blue' : 'btn-3d-white'}`}
                    style={{ padding: '0.25rem 0.5rem', fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '0.85rem' : '1rem' }}
                    onClick={() => setFontSize(size)}
                  >
                    A{size === 'lg' ? '+' : size === 'sm' ? '-' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Pages Feed */}
            {pageNumbers.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>No text content found in this document.</p>
              </div>
            ) : (
              pageNumbers.map(page => {
                const sections = pageMap[page] || [];
                const isRead = readPages.includes(page);
                const summary = pageSummaries[page];
                const visibleSections = sections.filter(s => matchesSearch(s.content) || matchesSearch(s.heading || ''));

                if (searchQuery && visibleSections.length === 0) return null;

                return (
                  <div
                    key={page}
                    id={`page-${page}`}
                    className="card"
                    style={{
                      padding: '1.75rem',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-xl)',
                      border: isRead ? '2px solid var(--color-green)' : '2px solid var(--color-border)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem'
                    }}
                  >
                    {/* Page Header Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      borderBottom: '2px solid var(--color-border)',
                      paddingBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          background: isRead ? 'var(--color-green)' : 'var(--color-surface-hover)',
                          color: isRead ? '#ffffff' : 'var(--color-text-main)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}>
                          Page {page}
                        </span>
                        {isRead && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-green)', fontWeight: 700 }}>
                            ⭐ Mastered (+5 XP)
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          className={`btn-3d ${summary ? 'btn-3d-gold' : 'btn-3d-white'}`}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => generatePageSummary(page, sections)}
                          disabled={summarizingPage === page}
                        >
                          {summarizingPage === page ? 'Analyzing...' : summary ? 'Hide Summary' : 'Key Concept Summary'}
                        </button>
                        <button
                          className={`btn-3d ${isRead ? 'btn-3d-green' : 'btn-3d-white'}`}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => togglePageRead(page)}
                        >
                          {isRead ? '✓ Completed' : 'Mark as Read'}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Smart Page Summary Box */}
                    {summary && (
                      <div style={{
                        background: 'rgba(255, 200, 0, 0.08)',
                        border: '2px solid var(--color-gold)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--color-gold-dark)', fontSize: '0.85rem' }}>
                          <span>💡</span>
                          <span>Page {page} High-Yield Takeaways</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--color-text-main)' }}>
                          <li><strong>Core Thesis:</strong> {summary.core}</li>
                          <li><strong>Mechanism:</strong> {summary.mechanism}</li>
                          <li><strong>Exam Target:</strong> {summary.examTip}</li>
                        </ul>
                      </div>
                    )}

                    {/* Page Content Sections & Marginalia */}
                    {visibleSections.map((sec, idx) => {
                      const pinnedNote = pinnedNotes[sec.section_index];
                      const isAddingPin = activePinInputIndex === sec.section_index;

                      return (
                        <div
                          key={sec.id || idx}
                          onMouseUp={() => handleMouseUp(sec.section_index, sec.page_number)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {sec.heading && (
                              <h3 style={{
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                margin: 0,
                                color: 'var(--color-text-main)'
                              }}>
                                {sec.heading}
                              </h3>
                            )}
                            <button
                              onClick={() => {
                                setActivePinInputIndex(isAddingPin ? null : sec.section_index);
                                setPinDraftText(pinnedNote || '');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                fontWeight: 700
                              }}
                            >
                              📌 {pinnedNote ? 'Edit Margin Note' : '+ Pin Note'}
                            </button>
                          </div>

                          <div style={{
                            fontSize: fontSizeMap[fontSize].font,
                            lineHeight: fontSizeMap[fontSize].line,
                            color: 'var(--color-text-main)',
                            whiteSpace: 'pre-wrap',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            userSelect: 'text'
                          }}>
                            {sec.content}
                          </div>

                          {/* Marginalia Pinned Note Display */}
                          {pinnedNote && !isAddingPin && (
                            <div style={{
                              background: 'rgba(28, 176, 246, 0.1)',
                              borderLeft: '4px solid var(--color-blue)',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                              fontSize: '0.8rem',
                              color: 'var(--color-text-main)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span><strong>📌 Marginalia:</strong> {pinnedNote}</span>
                              <button
                                onClick={() => {
                                  const next = { ...pinnedNotes };
                                  delete next[sec.section_index];
                                  savePinnedNotes(next);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {/* Marginalia Input Drawer */}
                          {isAddingPin && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <input
                                type="text"
                                placeholder="Type marginal note for this paragraph..."
                                value={pinDraftText}
                                onChange={e => setPinDraftText(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.8rem',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--color-blue)',
                                  background: 'var(--color-bg)',
                                  color: 'var(--color-text-main)'
                                }}
                              />
                              <button
                                className="btn-3d btn-3d-blue"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  if (pinDraftText.trim()) {
                                    savePinnedNotes({ ...pinnedNotes, [sec.section_index]: pinDraftText.trim() });
                                  }
                                  setActivePinInputIndex(null);
                                }}
                              >
                                Save Note
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Selection Highlighter Tooltip */}
      {selectedText && selectionCoords && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
            transform: 'translate(-50%, -100%)',
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            padding: '0.4rem 0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 9999,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* 5 Highlighting Colors */}
          {(['gold', 'green', 'blue', 'purple', 'coral'] as const).map(color => (
            <button
              key={color}
              onClick={() => applyHighlight(color)}
              title={`Highlight with ${HIGHLIGHT_COLORS[color].label}`}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: HIGHLIGHT_COLORS[color].border,
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.1s'
              }}
            />
          ))}

          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />

          {/* Turn into Flashcard */}
          <button
            onClick={() => openFlashcardModal(selectedText.text)}
            className="btn-3d btn-3d-gold"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            ⚡ Flashcard
          </button>

          {/* Ask Companion */}
          <button
            onClick={() => askCompanionAboutText(selectedText.text)}
            className="btn-3d btn-3d-blue"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            💬 Ask {activeCompanion.name}
          </button>

          {/* Dismiss */}
          <button
            onClick={() => { setSelectedText(null); setSelectionCoords(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Instant Flashcard Creator Modal */}
      {flashcardModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderRadius: 'var(--radius-xl)',
            border: '3px solid var(--color-gold)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>⚡ Create Flashcard from Highlight</h3>
              <button
                onClick={() => setFlashcardModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Card Front (Question / Prompt)
              </label>
              <textarea
                value={flashcardModal.front}
                onChange={e => setFlashcardModal({ ...flashcardModal, front: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Card Back (Answer / Definition)
              </label>
              <textarea
                value={flashcardModal.back}
                onChange={e => setFlashcardModal({ ...flashcardModal, back: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-white"
                onClick={() => setFlashcardModal(null)}
                disabled={creatingCard}
              >
                Cancel
              </button>
              <button
                className="btn-3d btn-3d-gold"
                onClick={handleSaveFlashcard}
                disabled={creatingCard}
              >
                {creatingCard ? 'Saving...' : '✓ Add to Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
