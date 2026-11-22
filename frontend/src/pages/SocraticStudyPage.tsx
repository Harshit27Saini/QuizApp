import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { companionService } from '../services/companions';
import { soundManager } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { xpService } from '../services/xp';
import { questService } from '../services/quests';
import type { StudyDocument, SocraticTeachResponse } from '../types';

export const SocraticStudyPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [document, setDocument] = useState<StudyDocument | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadingTeach, setLoadingTeach] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Socratic Tutor State
  const [teachingData, setTeachingData] = useState<SocraticTeachResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [freeformAnswer, setFreeformAnswer] = useState<string>('');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{ isCorrect: boolean; feedback: string; xp: number } | null>(null);
  const [masteredPages, setMasteredPages] = useState<number[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPdfExpanded, setIsPdfExpanded] = useState(false);

  // Free-form conversational doubt asking
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatThread, setChatThread] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  // Active Companion
  const activeCompanion = companionService.getActiveCompanion();
  const [companionId, setCompanionId] = useState<string>(activeCompanion?.id || 'sydney');

  // Load Document metadata and fetch raw PDF Blob
  useEffect(() => {
    if (!documentId) return;
    setLoadingDoc(true);

    api.getDocumentPreview(documentId)
      .then(doc => {
        setDocument(doc);
        // Load mastered pages from localStorage
        const saved = localStorage.getItem(`recall_mastered_pages_${documentId}`);
        if (saved) {
          try { setMasteredPages(JSON.parse(saved)); } catch {}
        }
      })
      .catch(err => setError(err.message || 'Failed to load document metadata'))
      .finally(() => setLoadingDoc(false));

    // Fetch raw blob for seamless visual PDF viewing
    api.fetchDocumentRawBlob(documentId)
      .then(blobUrl => setPdfBlobUrl(blobUrl))
      .catch(err => {
        console.warn("[SocraticStudyPage] Blob fetch fallback to direct URL:", err);
        setPdfBlobUrl(api.getDocumentFileUrl(documentId));
      });
  }, [documentId]);

  // Load Socratic teaching for the active page
  const fetchTeaching = async (page: number, userAns?: string, prevQ?: string) => {
    if (!documentId) return;
    setLoadingTeach(true);
    try {
      const res = await api.socraticTeachPage(documentId, {
        page_number: page,
        pet_id: companionId,
        user_response: userAns,
        previous_question: prevQ
      });
      setTeachingData(res);
      setSelectedOption(null);
      setFreeformAnswer('');
    } catch (err: any) {
      console.error("[SocraticStudyPage] Teaching fetch error:", err);
    } finally {
      setLoadingTeach(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      setEvaluationResult(null);
      setChatThread([]);
      fetchTeaching(currentPage);
      setSearchParams({ page: String(currentPage) });
    }
  }, [documentId, currentPage, companionId]);

  const handlePageChange = (newPage: number) => {
    const total = document?.total_pages || 1;
    const clamped = Math.max(1, Math.min(total, newPage));
    if (clamped !== currentPage) {
      soundManager.playTick();
      setCurrentPage(clamped);
    }
  };

  // Submit Answer to the Socratic Check
  const handleSubmitAnswer = async (optionId?: string, textAns?: string) => {
    const chosen = optionId || selectedOption;
    const written = textAns || freeformAnswer;
    if (!chosen && !written) return;
    if (evaluating || !teachingData) return;

    soundManager.playTick();
    setEvaluating(true);

    const question = teachingData.socratic_question;
    const answerText = chosen
      ? (teachingData.options.find(o => o.id === chosen)?.text || chosen)
      : written;

    try {
      const evalRes = await api.socraticTeachPage(documentId!, {
        page_number: currentPage,
        pet_id: companionId,
        user_response: answerText,
        previous_question: question
      });

      const isCorrect = evalRes.is_correct ?? (chosen === teachingData.correct_option_id);
      const earnedXp = isCorrect ? 15 : 5;

      setEvaluationResult({
        isCorrect,
        feedback: evalRes.evaluation || (isCorrect ? 'Outstanding reasoning!' : 'Review the slide context.'),
        xp: earnedXp
      });

      if (isCorrect) {
        soundManager.playVictory();
        triggerConfetti();
        xpService.awardXp(earnedXp, `Mastered Slide ${currentPage}`);
        questService.recordProgress('learning_unit', 1);

        if (!masteredPages.includes(currentPage)) {
          const updated = [...masteredPages, currentPage];
          setMasteredPages(updated);
          localStorage.setItem(`recall_mastered_pages_${documentId}`, JSON.stringify(updated));
        }
      } else {
        soundManager.playWrong();
      }
    } catch (err: any) {
      console.error("Evaluation error:", err);
      setEvaluationResult({
        isCorrect: true,
        feedback: "Great job thinking through this slide concept!",
        xp: 10
      });
    } finally {
      setEvaluating(false);
    }
  };

  // Chat with companion about current slide
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading || !documentId) return;
    const text = chatInput.trim();
    setChatInput('');
    soundManager.playTick();
    setChatThread(prev => [...prev, { role: 'user', text }]);
    setChatLoading(true);

    try {
      const res = await api.chatWithPet({
        pet_id: companionId,
        user_message: text,
        current_topic: `Slide ${currentPage}: ${teachingData?.slide_title || document?.filename}`,
        context_text: `${teachingData?.core_principle || ''}\n${teachingData?.intuitive_analogy || ''}`,
        document_id: documentId
      });

      setChatThread(prev => [...prev, { role: 'assistant', text: res.reply }]);
      soundManager.playCorrect();
    } catch (err: any) {
      setChatThread(prev => [...prev, { role: 'assistant', text: `Sorry, I had trouble connecting: ${err?.message || 'Error'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Audio Read-Aloud
  const handleTextToSpeech = () => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `${teachingData?.slide_title}. ${teachingData?.core_principle}. Here is a helpful analogy: ${teachingData?.intuitive_analogy}.`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Export Summary Notes
  const handleDownloadSessionNotes = () => {
    const title = document?.filename || 'Study Session';
    const content = `# Socratic Study Notes: ${title}\n\n*Mastered Slides: ${masteredPages.join(', ') || 'Current'}*\n\n## Current Focus (Slide ${currentPage})\n### ${teachingData?.slide_title || 'Key Principle'}\n${teachingData?.core_principle || ''}\n\n### Intuitive Analogy\n${teachingData?.intuitive_analogy || ''}\n\n---\n*Generated by Recall Socratic Workspace*`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `Recall_Notes_Slide_${currentPage}.md`;
    link.click();
    URL.revokeObjectURL(url);
    soundManager.playVictory();
  };

  const totalPages = document?.total_pages || 1;
  const isMastered = masteredPages.includes(currentPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '88vh' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: '1.5px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
          >
            ← Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                🎓 SOCRATIC TEACH-ME
              </span>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>
                {document?.filename || 'Study Document'}
              </h1>
            </div>
            <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Interactive Visual PDF Split-Screen • Guided by {teachingData?.pet_name || 'Study Buddy'}
            </p>
          </div>
        </div>

        {/* Slide Navigation & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            title="Previous Slide"
          >
            ◀ Prev
          </button>

          <span className="badge badge-blue" style={{ fontSize: '0.8rem', fontWeight: 900, padding: '0.4rem 0.75rem' }}>
            Slide {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            title="Next Slide"
          >
            Next ▶
          </button>

          {/* Expand PDF toggle */}
          <button
            onClick={() => setIsPdfExpanded(prev => !prev)}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            title={isPdfExpanded ? "Restore Split View" : "Expand PDF Width"}
          >
            {isPdfExpanded ? '⬌ Split View' : '⛶ Expand PDF'}
          </button>

          {/* Companion Switcher */}
          <select
            value={companionId}
            onChange={e => {
              setCompanionId(e.target.value);
              companionService.setActiveCompanion(e.target.value);
            }}
            className="btn-3d btn-3d-white"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
            title="Switch study companion persona"
          >
            <option value="sydney">🐕 Sydney</option>
            <option value="connie">🐈 Connie</option>
            <option value="milo">🐱 Milo</option>
            <option value="scooby">🐶 Scooby</option>
            <option value="bunny">🐾 Bunny</option>
            <option value="nandhini">⭐ Nandhini</option>
            <option value="coach_harshit">⚡ Coach Harshit</option>
            <option value="duo">🦉 Duo Owl</option>
            <option value="archimedes">🧙‍♂️ Archimedes</option>
          </select>

          {/* Export Notes */}
          <button
            onClick={handleDownloadSessionNotes}
            className="btn-3d btn-3d-white"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            title="Export Slide Notes"
          >
            📝 Export Notes
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', margin: 0, fontWeight: 700 }}>{error}</p>
        </div>
      )}

      {loadingDoc ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          Loading document and initializing visual PDF split-screen...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isPdfExpanded ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.25rem',
          alignItems: 'stretch'
        }}>
        {/* =================================================================== */}
        {/* LEFT PANE: AUTHENTIC, UNCHANGED VISUAL PDF VIEWER                   */}
        {/* =================================================================== */}
        <div className="card" style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0.75rem',
          height: '84vh',
          background: 'var(--color-surface)',
          border: isMastered ? '2px solid var(--color-green)' : '2px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          position: 'relative'
        }}>
          {/* PDF Viewer Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.4rem 0.75rem',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>📄</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                Original Slide Deck (Unchanged Layout)
              </span>
            </div>
            {isMastered && (
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                🟢 Slide Mastered (+15 XP)
              </span>
            )}
          </div>

          {/* Live PDF Embed */}
          {pdfBlobUrl ? (
            <iframe
              src={`${pdfBlobUrl}#page=${currentPage}&toolbar=1&navpanes=0`}
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff'
              }}
              title="Original Visual PDF"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Loading visual PDF viewer...
            </div>
          )}

          {/* Floating Slide Jump Pill at bottom */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-full)',
            padding: '0.35rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ◀
            </button>
            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>
              Slide {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ▶
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT PANE: SOCRATIC AI COMPANION TUTOR                              */}
        {/* =================================================================== */}
        {!isPdfExpanded && (
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '84vh',
            padding: '1.25rem',
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '2px solid var(--color-blue)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 30px rgba(28, 176, 246, 0.1)',
            gap: '1rem'
          }}>
            {/* Tutor Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '2rem' }}>{teachingData?.avatar || activeCompanion.avatarIcon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>
                      {teachingData?.pet_name || activeCompanion.name}
                    </h3>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      TUTORING
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Teaching Slide {currentPage} • Socratic Check
                  </p>
                </div>
              </div>

              {/* TTS Listen Button */}
              <button
                onClick={handleTextToSpeech}
                className={`btn-3d ${isSpeaking ? 'btn-3d-red' : 'btn-3d-white'}`}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                title="Listen out loud"
              >
                {isSpeaking ? '⏹ Stop Audio' : '🔊 Listen Out Loud'}
              </button>
            </div>

            {loadingTeach ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                color: 'var(--color-text-muted)'
              }}>
                <span style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite' }}>
                  {teachingData?.avatar || '🐕'}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  Analyzing Slide {currentPage} and preparing Socratic check...
                </span>
              </div>
            ) : teachingData ? (
              <>
                {/* 1. Core Principle Card */}
                <div style={{
                  background: 'var(--color-surface-hover)',
                  border: '1.5px solid var(--color-border)',
                  borderLeft: '4px solid var(--color-blue)',
                  padding: '1rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-blue)' }}>
                      📖 CORE PRINCIPLE
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-subtle)' }}>
                      {teachingData.slide_title}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--color-text-main)' }}>
                    {teachingData.core_principle}
                  </p>
                </div>

                {/* 2. Intuitive Real-World Analogy */}
                <div style={{
                  background: 'rgba(206, 130, 255, 0.08)',
                  border: '1.5px solid rgba(206, 130, 255, 0.3)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--color-purple)', textTransform: 'uppercase', display: 'block' }}>
                      Intuitive Analogy:
                    </strong>
                    <span style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--color-text-main)' }}>
                      {teachingData.intuitive_analogy}
                    </span>
                  </div>
                </div>

                {/* 3. Socratic Active Recall Check */}
                <div style={{
                  background: 'var(--color-surface)',
                  border: '2px solid var(--color-gold)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                      ⚡ SOCRATIC UNDERSTANDING CHECK
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold)' }}>
                      +15 XP
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
                    {teachingData.socratic_question}
                  </h4>

                  {/* Interactive Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {teachingData.options.map(opt => {
                      const isSelected = selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (!evaluationResult) setSelectedOption(opt.id);
                          }}
                          style={{
                            padding: '0.75rem 0.9rem',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2px solid var(--color-blue)' : '1.5px solid var(--color-border)',
                            background: isSelected ? 'rgba(28, 176, 246, 0.1)' : 'var(--color-bg)',
                            cursor: evaluationResult ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            fontSize: '0.875rem',
                            lineHeight: 1.45,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--color-blue)' : 'var(--color-surface)',
                            color: isSelected ? '#fff' : 'var(--color-text-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            flexShrink: 0
                          }}>
                            {opt.id.toUpperCase()}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Free-form explanation box */}
                  {!evaluationResult && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <input
                        type="text"
                        placeholder="Or answer in your own words..."
                        value={freeformAnswer}
                        onChange={e => setFreeformAnswer(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmitAnswer(); }}
                        disabled={evaluating}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--color-border)',
                          background: 'var(--color-bg)',
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        onClick={() => handleSubmitAnswer()}
                        disabled={evaluating || (!selectedOption && !freeformAnswer.trim())}
                        className="btn-3d btn-3d-green"
                        style={{ padding: '0.6rem 1.15rem', fontSize: '0.85rem', fontWeight: 800 }}
                      >
                        {evaluating ? 'Checking...' : 'Check Answer ⚡'}
                      </button>
                    </div>
                  )}

                  {/* Real-Time Evaluation Result */}
                  {evaluationResult && (
                    <div style={{
                      background: evaluationResult.isCorrect ? 'rgba(88, 204, 2, 0.12)' : 'rgba(255, 75, 75, 0.12)',
                      borderLeft: `4px solid ${evaluationResult.isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`,
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: evaluationResult.isCorrect ? 'var(--color-green)' : 'var(--color-red)', fontSize: '0.9rem' }}>
                          {evaluationResult.isCorrect ? '🎉 Correct! Superb intuition.' : '❌ Not quite!'}
                        </strong>
                        <span className="badge badge-xp" style={{ fontSize: '0.75rem' }}>
                          +{evaluationResult.xp} XP
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--color-text-main)' }}>
                        {evaluationResult.feedback}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="btn-3d btn-3d-blue"
                          style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem' }}
                        >
                          Proceed to Slide {currentPage + 1} ➔
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Have Doubts? Free-Form Chat Thread with Companion */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  borderTop: '1.5px solid var(--color-border)',
                  paddingTop: '0.85rem'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                    💬 Ask {teachingData.pet_name} anything about this slide:
                  </span>

                  {chatThread.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        padding: '0.65rem 0.95rem',
                        borderRadius: 'var(--radius-md)',
                        background: msg.role === 'user' ? 'var(--color-blue)' : 'var(--color-bg)',
                        color: msg.role === 'user' ? '#fff' : 'var(--color-text-main)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                        fontSize: '0.85rem',
                        lineHeight: 1.5
                      }}
                    >
                      {msg.text}
                    </div>
                  ))}

                  {chatLoading && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      {teachingData.pet_name} is reasoning with Gemini...
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <input
                      type="text"
                      placeholder={`Ask ${teachingData.pet_name} about this slide or formulas...`}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                      disabled={chatLoading}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-bg)',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="btn-3d btn-3d-blue"
                      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                    >
                      Send 💬
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                Unable to load teaching for this slide.
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
