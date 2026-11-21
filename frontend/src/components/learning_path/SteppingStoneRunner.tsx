import React, { useState, useEffect } from 'react';
import type { PathNode, PathNodeQuestion } from '../../types';
import { api } from '../../services/api';
import { companionService } from '../../services/companions';
import { soundManager } from '../../utils/sound';
import { triggerConfetti } from '../../utils/confetti';
import { questService } from '../../services/quests';
import { xpService } from '../../services/xp';

interface SteppingStoneRunnerProps {
  node: PathNode;
  documentId: string;
  collectionId?: string;
  docTitle?: string;
  onClose: () => void;
  onComplete: (score: number, passed: boolean) => void;
  onNavigateToReader: (slidePage?: number) => void;
}

type RunnerStep = 'theory' | 'example' | 'companion' | 'quiz' | 'celebration';

export const SteppingStoneRunner: React.FC<SteppingStoneRunnerProps> = ({
  node,
  documentId: _documentId,
  collectionId: _collectionId,
  docTitle,
  onClose,
  onComplete,
  onNavigateToReader
}) => {
  const [currentStep, setCurrentStep] = useState<RunnerStep>('theory');
  const activeCompanion = companionService.getActiveCompanion();

  // ---------------------------------------------------------------------------
  // Step 2: Worked Example State (Textbook Model)
  // ---------------------------------------------------------------------------
  const [showSolution, setShowSolution] = useState(true);

  // ---------------------------------------------------------------------------
  // Step 1: Slide Breakdown & Confidence Toggles + TTS + TL;DR State
  // ---------------------------------------------------------------------------
  const [confidenceMap, setConfidenceMap] = useState<Record<string, 'got_it' | 'tricky'>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tldrBullets, setTldrBullets] = useState<string[]>([]);
  const [cheatSheetMarkdown, setCheatSheetMarkdown] = useState<string>('');
  const [loadingTldr, setLoadingTldr] = useState(false);

  const toggleConfidence = (key: string, val: 'got_it' | 'tricky') => {
    soundManager.playTick();
    setConfidenceMap(prev => ({
      ...prev,
      [key]: prev[key] === val ? undefined as any : val
    }));
  };

  const handleTextToSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = `${node.title}. ${node.substantive_content?.overview || node.concept_summary}. Core mechanisms: ${(node.substantive_content?.mechanisms || []).join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFetchTldr = async () => {
    try {
      setLoadingTldr(true);
      soundManager.playTick();
      const res = await api.summarizeStone({
        title: node.title,
        overview: node.substantive_content?.overview || node.concept_summary,
        mechanisms: node.substantive_content?.mechanisms || [],
        examples: node.substantive_content?.examples || [],
        slide_label: node.source_page ? `Slide ${node.source_page}` : undefined
      });
      setTldrBullets(res.tldr_bullets || []);
      setCheatSheetMarkdown(res.cheat_sheet_markdown || '');
      soundManager.playCorrect();
    } catch {
      setTldrBullets([
        'Core takeaway: Master feedback integration before testing edge boundary cases.',
        'Equation/Rule: Error metrics dynamically scale to prevent state divergence.',
        'Exam focus: Verify disturbance conditions rather than assuming nominal behavior.'
      ]);
      setCheatSheetMarkdown(`# Quick Cheat Sheet: ${node.title}\n\n${node.concept_summary}`);
    } finally {
      setLoadingTldr(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 3: Companion Queries & Doubts (Gemini Chat) State
  // ---------------------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Initialize companion greeting with personalized awareness of tricky concepts
  useEffect(() => {
    const trickyKeys = Object.entries(confidenceMap).filter(([_, v]) => v === 'tricky').map(([k]) => k);
    let greeting = `Hey there! I'm ${activeCompanion.name}. How can I help you conquer "${node.title}"? Ask me anything about these slides!`;
    if (trickyKeys.length > 0) {
      greeting = `Hey! I noticed you marked some concepts in "${node.title}" as tricky. Don't worry at all—ask me about them and I'll break them down with simple, memorable analogies!`;
    }
    setChatMessages([{ role: 'assistant', content: greeting }]);
  }, [currentStep]);

  const handleSendQuery = async (queryText?: string) => {
    const text = (queryText || chatInput).trim();
    if (!text || chatLoading) return;

    const userMsg = { role: 'user' as const, content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.chatWithPet({
        pet_id: activeCompanion.id,
        user_message: text,
        current_topic: node.title,
        context_text: `${node.title}\n${node.substantive_content?.overview || node.concept_summary}\nMechanisms:\n${(node.substantive_content?.mechanisms || []).join('\n')}`,
        chat_history: chatMessages.slice(-4)
      });
      soundManager.playCorrect();
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Here is the key insight for "${node.title}": Focus on the primary mechanism where dynamic adaptation prevents state errors. In exam questions, watch out for distractors that assume constant linear behavior!`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 4: Balanced Mastery Quiz State
  // ---------------------------------------------------------------------------
  const [questionQueue, setQuestionQueue] = useState<PathNodeQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [comboStreak, setComboStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finalScore, setFinalScore] = useState<{ score: number; passed: boolean; xp: number } | null>(null);

  useEffect(() => {
    if (node.questions && node.questions.length > 0) {
      setQuestionQueue([...node.questions]);
      setQIndex(0);
      setCorrectCount(0);
      setSelectedOption(null);
      setFeedback(null);
    }
  }, [node]);

  const currentQuestion = questionQueue[qIndex];

  const handleCheckAnswer = () => {
    if (!selectedOption || !currentQuestion || feedback) return;

    const isCorrect = currentQuestion.correct_answers.includes(selectedOption);

    if (isCorrect) {
      soundManager.playCorrect();
      setComboStreak(prev => prev + 1);
      setCorrectCount(prev => prev + 1);
    } else {
      soundManager.playError();
      setComboStreak(0);
      // Recycle missed question to the end for true mastery
      setQuestionQueue(prev => [...prev, { ...currentQuestion, id: `${currentQuestion.id}_retry_${Date.now()}` }]);
    }

    setFeedback({
      isCorrect,
      explanation: currentQuestion.explanation
    });
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setFeedback(null);

    if (qIndex < questionQueue.length - 1) {
      setQIndex(prev => prev + 1);
    } else {
      // Quiz Complete
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const total = node.questions.length || 1;
    const rawScore = Math.min(100, Math.round((correctCount / total) * 100));
    const passed = rawScore >= 70;
    const earnedXp = passed ? (node.xp_reward || 25) : 5;

    xpService.awardXp(earnedXp, `Completed: ${node.title}`);
    questService.recordProgress('learning_unit', 1);

    if (passed) {
      soundManager.playVictory();
      triggerConfetti();
    }

    setFinalScore({ score: rawScore, passed, xp: earnedXp });
    setCurrentStep('celebration');
  };

  // ---------------------------------------------------------------------------
  // Cheat Sheet File Downloader
  // ---------------------------------------------------------------------------
  const handleDownloadCheatSheet = () => {
    const content = cheatSheetMarkdown || `# Quick Cheat Sheet: ${node.title}\n\n## 🎯 Core Overview\n${node.substantive_content?.overview || node.concept_summary}\n\n## ⚙️ Key Mechanisms\n${(node.substantive_content?.mechanisms || []).map(m => `- ${m}`).join('\n')}\n\n## ⚠️ Common Exam Trap\n${node.substantive_content?.exam_pitfalls || 'Verify boundary conditions.'}\n\n---\n*Generated by Recall for ${docTitle || 'Study Material'}*`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Recall_CheatSheet_${node.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    soundManager.playVictory();
  };

  const isChallenge = node.is_challenge_trail || node.node_type === 'challenge_gauntlet';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '92vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.75rem',
        border: isChallenge ? '2.5px solid var(--color-gold)' : '2px solid var(--color-border)',
        boxShadow: isChallenge ? '0 16px 48px rgba(255, 184, 0, 0.25)' : '0 16px 48px rgba(0,0,0,0.25)',
        gap: '1.25rem'
      }}>
        {/* Runner Header & Top Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`badge ${isChallenge ? 'badge-xp' : 'badge-mode'}`} style={{ fontSize: '0.75rem' }}>
              {isChallenge ? '👑 CHALLENGE GAUNTLET' : 'STUDY RUNNER'}
            </span>
            {node.source_page && (
              <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                📍 Slides {node.slide_start || node.source_page}–{node.slide_end || node.source_page}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Direct Gateway to Reader */}
            <button
              onClick={() => onNavigateToReader(node.source_page)}
              className="btn-3d btn-3d-white"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              title="Jump to these exact slides in the visual document reader"
            >
              📖 View in Reader
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                color: 'var(--color-text-subtle)'
              }}
              title="Save & Close Runner"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          padding: '4px',
          background: 'var(--color-surface-hover)',
          borderRadius: 'var(--radius-md)'
        }}>
          {[
            { id: 'theory', label: '1. Theory & Rules 📖' },
            { id: 'example', label: '2. Worked Example 🎯' },
            { id: 'companion', label: '3. Ask Buddy 💬' },
            { id: 'quiz', label: '4. Practice Check ⚡' }
          ].map(s => {
            const isActive = currentStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id as RunnerStep)}
                style={{
                  padding: '0.5rem 0.25rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  background: isActive ? 'var(--color-surface)' : 'transparent',
                  color: isActive ? 'var(--color-blue)' : 'var(--color-text-subtle)',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* STEP 1: STRUCTURED THEORY & OPERATIONAL RULES                      */}
        {/* =================================================================== */}
        {currentStep === 'theory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
                  {node.title}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                  Structured Theory & Operational Rules
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Text-to-Speech Button */}
                <button
                  onClick={handleTextToSpeech}
                  className={`btn-3d ${isSpeaking ? 'btn-3d-red' : 'btn-3d-white'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                  title="Listen to Slide Overview (Audio Read-Aloud)"
                >
                  {isSpeaking ? '⏹ Stop Audio' : '🔊 Listen Out Loud'}
                </button>

                {/* 1-Click Gateway to Full PDF Viewer */}
                <button
                  onClick={() => onNavigateToReader(node.source_page)}
                  className="btn-3d btn-3d-white"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                  title="Open this exact slide in the visual PDF reader with highlighters"
                >
                  📄 View Slide in PDF
                </button>
              </div>
            </div>

            {/* Substantive Theory Block */}
            <div style={{
              background: 'var(--color-surface-hover)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-blue)' }}>
                  📖 Conceptual Overview
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => toggleConfidence('overview', 'got_it')}
                    className={`badge ${confidenceMap['overview'] === 'got_it' ? 'badge-success' : 'badge-gray'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    🟢 Got It
                  </button>
                  <button
                    onClick={() => toggleConfidence('overview', 'tricky')}
                    className={`badge ${confidenceMap['overview'] === 'tricky' ? 'badge-red' : 'badge-gray'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    🟡 Tricky
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--color-text-main)', margin: 0 }}>
                {node.substantive_content?.overview || node.concept_summary}
              </p>
            </div>

            {/* Core Mechanisms */}
            {node.substantive_content?.mechanisms && node.substantive_content.mechanisms.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: '0.5rem' }}>
                  ⚙️ Key Mechanisms & Rules:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {node.substantive_content.mechanisms.map((mech, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--color-surface)',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--color-border)',
                        borderLeft: '4px solid var(--color-blue)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', lineHeight: 1.5, flex: 1 }}>{mech}</span>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        <button
                          onClick={() => toggleConfidence(`mech_${idx}`, 'got_it')}
                          className={`badge ${confidenceMap[`mech_${idx}`] === 'got_it' ? 'badge-success' : 'badge-gray'}`}
                          style={{ cursor: 'pointer', fontSize: '0.65rem' }}
                        >
                          🟢
                        </button>
                        <button
                          onClick={() => toggleConfidence(`mech_${idx}`, 'tricky')}
                          className={`badge ${confidenceMap[`mech_${idx}`] === 'tricky' ? 'badge-red' : 'badge-gray'}`}
                          style={{ cursor: 'pointer', fontSize: '0.65rem' }}
                        >
                          🟡
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exam Pitfalls */}
            {node.substantive_content?.exam_pitfalls && (
              <div style={{
                background: 'rgba(255, 75, 75, 0.08)',
                border: '2px solid rgba(255, 75, 75, 0.35)',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                lineHeight: 1.5
              }}>
                <strong style={{ color: 'var(--color-red)' }}>⚠️ Classic Examination Pitfall: </strong>
                {node.substantive_content.exam_pitfalls}
              </div>
            )}

            {/* TL;DR Summary Button (Powered by Gemini) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(88, 204, 2, 0.08) 0%, rgba(28, 176, 246, 0.08) 100%)',
              border: '1.5px solid var(--color-border)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>
                  ✨ Gemini Slide Executive Summary
                </span>
                <button
                  onClick={handleFetchTldr}
                  disabled={loadingTldr}
                  className="btn-3d btn-3d-blue"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  {loadingTldr ? 'Summarizing...' : tldrBullets.length > 0 ? '🔄 Refresh TL;DR' : '✨ Summarize Slides (TL;DR)'}
                </button>
              </div>

              {tldrBullets.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {tldrBullets.map((b, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-text-subtle)' }}>
                  Click to distill all slides in this stone into 3 bullet points.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button
                onClick={() => onNavigateToReader(node.source_page)}
                className="btn-3d btn-3d-white"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                📖 Open in Full Reader
              </button>
              <button
                onClick={() => setCurrentStep('example')}
                className="btn-3d btn-3d-green"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                Proceed to Worked Example ➔
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: WORKED EXAMPLE & APPLICATION WALKTHROUGH                   */}
        {/* =================================================================== */}
        {currentStep === 'example' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
                  Worked Example & Case Walkthrough
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>
                  Translating theoretical principles into applied solutions for Slides {node.slide_start || node.source_page}–{node.slide_end || node.source_page}
                </p>
              </div>

              <button
                onClick={() => setShowSolution(prev => !prev)}
                className="btn-3d btn-3d-white"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                {showSolution ? '👁️ Hide Walkthrough' : '💡 Show Solution Walkthrough'}
              </button>
            </div>

            {/* Problem / Scenario Card */}
            <div style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-blue)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 4px 16px rgba(28, 176, 246, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-blue" style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                  🎯 APPLICATION SCENARIO
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontWeight: 700 }}>
                  Case Problem
                </span>
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.6, color: 'var(--color-text-main)' }}>
                {node.substantive_content?.examples && node.substantive_content.examples.length > 0
                  ? node.substantive_content.examples[0]
                  : `Practical application of ${node.title.replace(/^Slides?\s*\d+[-–]?\d*:\s*/i, '')} in engineering & analytical problem solving.`}
              </div>

              {node.substantive_content?.examples && node.substantive_content.examples.length > 1 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-subtle)', textTransform: 'uppercase' }}>
                    Additional Scenario:
                  </span>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--color-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    borderLeft: '3px solid var(--color-purple)'
                  }}>
                    {node.substantive_content.examples[1]}
                  </div>
                </div>
              )}
            </div>

            {/* Step-by-Step Solution Breakdown */}
            {showSolution && (
              <div style={{
                background: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-green)' }}>
                    ✅ Step-by-Step Solution Breakdown
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Step 1: Baseline Context */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    background: 'var(--color-surface)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--color-blue)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>1</span>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>Establish Governing Principle: </strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {node.substantive_content?.overview || node.concept_summary}
                      </span>
                    </div>
                  </div>

                  {/* Step 2+: Mechanisms application */}
                  {(node.substantive_content?.mechanisms || []).map((mech, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        background: 'var(--color-surface)',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-green)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>{idx + 2}</span>
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>Apply Rule #{idx + 1}: </strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          {mech}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Distinctions / Edge Cases */}
                  {node.substantive_content?.distinctions && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(147, 51, 234, 0.08)',
                      border: '1.5px solid rgba(147, 51, 234, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5
                    }}>
                      <strong style={{ color: 'var(--color-purple)' }}>💡 Key Distinction: </strong>
                      {node.substantive_content.distinctions}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Examiner's Pitfall Alert */}
            {node.substantive_content?.exam_pitfalls && (
              <div style={{
                background: 'rgba(255, 75, 75, 0.08)',
                border: '2px solid rgba(255, 75, 75, 0.35)',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                lineHeight: 1.5
              }}>
                <strong style={{ color: 'var(--color-red)' }}>⚠️ Examiner's Trap in this Example: </strong>
                {node.substantive_content.exam_pitfalls}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button
                onClick={() => setCurrentStep('theory')}
                className="btn-3d btn-3d-white"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                ← Back to Theory
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentStep('companion')}
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                >
                  Ask Buddy 💬
                </button>
                <button
                  onClick={() => setCurrentStep('quiz')}
                  className="btn-3d btn-3d-green"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                >
                  Check Understanding (Practice Quiz) ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: COMPANION QUERIES & DOUBTS BOX (Gemini AI)                  */}
        {/* =================================================================== */}
        {currentStep === 'companion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                overflow: 'hidden'
              }}>
                {activeCompanion.avatarImageUrl ? (
                  <img src={activeCompanion.avatarImageUrl} alt={activeCompanion.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  activeCompanion.avatarIcon
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>
                  Chat with {activeCompanion.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Grounded in Slides {node.slide_start || node.source_page}–{node.slide_end || node.source_page} • Powered by Gemini
                </p>
              </div>
            </div>

            {/* Suggested Query Chips */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                'Explain Slide 1 like I am 10',
                'What is the trickiest question on these slides?',
                'Give me a memorable real-world analogy',
                'Quiz me with a warm-up question!'
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSendQuery(chip)}
                  disabled={chatLoading}
                  className="btn-3d btn-3d-white"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  💡 {chip}
                </button>
              ))}
            </div>

            {/* Chat Messages Scroll Container */}
            <div style={{
              minHeight: '200px',
              maxHeight: '260px',
              overflowY: 'auto',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.role === 'user' ? 'var(--color-blue)' : 'var(--color-surface)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--color-text-main)',
                    border: msg.role === 'user' ? 'none' : '1.5px solid var(--color-border)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  {activeCompanion.name} is thinking with Gemini...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder={`Ask ${activeCompanion.name} anything about these slides...`}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendQuery(); }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.9rem'
                }}
              />
              <button
                onClick={() => handleSendQuery()}
                disabled={chatLoading || !chatInput.trim()}
                className="btn-3d btn-3d-blue"
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}
              >
                Send 💬
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button
                onClick={() => setCurrentStep('example')}
                className="btn-3d btn-3d-white"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                ← Back to Worked Example
              </button>
              <button
                onClick={() => setCurrentStep('quiz')}
                className="btn-3d btn-3d-green"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                I'm Ready! Take the Quiz ➔
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: BALANCED MASTERY QUIZ (Exact Same Slides)                  */}
        {/* =================================================================== */}
        {currentStep === 'quiz' && currentQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-mode" style={{ fontSize: '0.75rem' }}>
                  QUESTION {qIndex + 1} OF {questionQueue.length}
                </span>
                {comboStreak >= 2 && (
                  <span className="badge badge-xp" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    🔥 {comboStreak} Combo Streak!
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-blue)' }}>
                📍 Slides {node.slide_start || node.source_page}–{node.slide_end || node.source_page}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
              {currentQuestion.prompt}
            </h3>

            {/* Balanced Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {currentQuestion.options.map(opt => {
                const isSelected = selectedOption === opt.id;
                let optBorder = '2px solid var(--color-border)';
                let optBg = 'var(--color-surface)';

                if (feedback) {
                  if (currentQuestion.correct_answers.includes(opt.id)) {
                    optBorder = '2px solid var(--color-green)';
                    optBg = 'rgba(88, 204, 2, 0.12)';
                  } else if (isSelected && !feedback.isCorrect) {
                    optBorder = '2px solid var(--color-red)';
                    optBg = 'rgba(255, 75, 75, 0.12)';
                  }
                } else if (isSelected) {
                  optBorder = '2px solid var(--color-blue)';
                  optBg = 'rgba(28, 176, 246, 0.1)';
                }

                return (
                  <div
                    key={opt.id}
                    onClick={() => { if (!feedback) setSelectedOption(opt.id); }}
                    style={{
                      padding: '0.875rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: optBorder,
                      background: optBg,
                      cursor: feedback ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.925rem',
                      lineHeight: 1.45,
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--color-blue)' : 'var(--color-surface-hover)',
                      color: isSelected ? '#fff' : 'var(--color-text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      {opt.id.toUpperCase()}
                    </span>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Instant Feedback Notice */}
            {feedback && (
              <div style={{
                background: feedback.isCorrect ? 'rgba(88, 204, 2, 0.12)' : 'rgba(255, 75, 75, 0.12)',
                borderLeft: `4px solid ${feedback.isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`,
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 900, color: feedback.isCorrect ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {feedback.isCorrect ? '🎉 Correct! Nicely reasoned.' : '❌ Not quite!'}
                </div>
                <div style={{ marginTop: '0.35rem', color: 'var(--color-text-main)' }}>
                  {feedback.explanation}
                </div>
              </div>
            )}

            {/* Check / Next Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              {!feedback ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!selectedOption}
                  className="btn-3d btn-3d-green"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                >
                  Check Answer ⚡
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="btn-3d btn-3d-blue"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                >
                  Continue →
                </button>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CELEBRATION & CHEAT SHEET EXPORT                                   */}
        {/* =================================================================== */}
        {currentStep === 'celebration' && finalScore && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1rem 0' }}>
            <div style={{ fontSize: '4rem' }}>{finalScore.passed ? '🏆✨' : '💪'}</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>
              {finalScore.passed
                ? (isChallenge ? '👑 Challenge Gauntlet Mastered!' : 'Stepping Stone Mastered!')
                : 'Nice Effort! Review & Try Again'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '440px', margin: 0 }}>
              {finalScore.passed
                ? `You've proven mastery over Slides ${node.slide_start || node.source_page}–${node.slide_end || node.source_page}! Next stepping stone unlocked.`
                : 'Almost there! Take a moment to review the slides in the PDF reader and test again.'}
            </p>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="badge badge-xp" style={{ fontSize: '1.1rem', padding: '0.65rem 1.25rem' }}>
                ⚡ +{finalScore.xp} XP EARNED
              </div>
              <div className="badge badge-success" style={{ fontSize: '1.1rem', padding: '0.65rem 1.25rem' }}>
                SCORE: {finalScore.score}%
              </div>
            </div>

            {/* 1-Page Cheat Sheet Download */}
            <div style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--color-surface-hover)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              textAlign: 'left'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>📥 1-Page Revision Cheat Sheet</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Export summary notes for offline review</div>
              </div>
              <button
                onClick={handleDownloadCheatSheet}
                className="btn-3d btn-3d-white"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', flexShrink: 0 }}
              >
                Download .md
              </button>
            </div>

            <button
              onClick={() => {
                onComplete(finalScore.score, finalScore.passed);
                onClose();
              }}
              className="btn-3d btn-3d-green"
              style={{ width: '100%', maxWidth: '360px', padding: '0.875rem', fontSize: '1rem' }}
            >
              Continue Learning Journey ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
