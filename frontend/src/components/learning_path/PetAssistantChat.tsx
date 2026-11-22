import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { companionService } from '../../services/companions';
import { soundManager } from '../../utils/sound';
import type { PetProfile, PetMessage } from '../../types';

export interface PetAssistantChatProps {
  currentTopic?: string;
  contextText?: string;
  collectionId?: string;
  documentId?: string;
}

const DEFAULT_PETS: PetProfile[] = [
  {
    id: 'sydney',
    name: 'Sydney',
    breed: 'American Golden Retriever',
    avatar: '🐕',
    tagline: 'Endlessly enthusiastic & loyal study buddy!',
    style: 'Warm, encouraging, and upbeat golden retriever with friendly analogies.'
  },
  {
    id: 'connie',
    name: 'Connie',
    breed: 'Himalayan Persian Cat',
    avatar: '🐈',
    tagline: 'Elegant, razor-sharp & intellectually precise.',
    style: 'Polite, dignified, and meticulous with formal definitions and nuances.'
  },
  {
    id: 'milo',
    name: 'Milo',
    breed: 'White & Black Indie Cat',
    avatar: '🐱',
    tagline: 'Street-smart, practical & no-nonsense.',
    style: 'Sharp, direct, and focused on practical memory hacks and quick intuition.'
  },
  {
    id: 'scooby',
    name: 'Scooby',
    breed: 'Grey Lhasa Apso',
    avatar: '🐶',
    tagline: 'Calm, patient & wise companion.',
    style: 'Patient and protective, breaking down complex stress and dense problems.'
  },
  {
    id: 'bunny',
    name: 'Bunny',
    breed: 'Brown Lhasa Apso',
    avatar: '🐾',
    tagline: 'Bouncy, playful & cheerful cheerleader!',
    style: 'Lively, high-energy booster celebrating your breakthroughs and key takeaways.'
  },
  {
    id: 'nandhini',
    name: 'Nandhini',
    breed: 'Top Scholar & Peer Mentor',
    avatar: '⭐',
    tagline: 'Your #1 Study Mate & Exam Strategist!',
    style: 'Brilliant, ultra-supportive study partner sharing top-tier exam strategies.'
  },
  {
    id: 'coach_harshit',
    name: 'Coach Harshit',
    breed: 'Founder & Engineering Coach',
    avatar: '⚡',
    tagline: 'Founder & Engineering Coach',
    style: 'Direct, visionary, first-principles builder connecting theory to real engineering.'
  },
  {
    id: 'duo',
    name: 'Duo Owl',
    breed: 'Streak Guardian Owl',
    avatar: '🦉',
    tagline: 'Streak guardian & active recall fanatic!',
    style: 'High-energy, focused on consistency, active recall, and daily progress.'
  },
  {
    id: 'archimedes',
    name: 'Prof. Archimedes',
    breed: 'First-Principles Scholar',
    avatar: '🧙‍♂️',
    tagline: 'First-principles philosopher & deep thinker.',
    style: 'Socratic scholar breaking down laws of science and logic to first principles.'
  }
];

const PRESETS = [
  { id: 'summary', icon: '📋', label: 'Executive Summary', prompt: 'Summarize key principles & takeaways' },
  { id: 'quiz_me', icon: '⚡', label: 'Quiz Me (3 Qs)', prompt: 'Quiz me with 3 challenging questions' },
  { id: 'explain_simple', icon: '💡', label: "Explain Like I'm 10", prompt: 'Explain simply with a real-world analogy' },
  { id: 'exam_traps', icon: '🚨', label: 'Exam Pitfalls & Traps', prompt: 'What are common exam traps examiners test on?' },
  { id: 'formulas', icon: '📐', label: 'Formulas & Rules', prompt: 'Extract all key formulas & operational rules' },
  { id: 'study_plan', icon: '📅', label: '7-Day Study Plan', prompt: 'Create an efficient 7-day revision schedule' },
];

export const PetAssistantChat: React.FC<PetAssistantChatProps> = ({
  currentTopic,
  contextText,
  collectionId,
  documentId
}) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [pets, setPets] = useState<PetProfile[]>(DEFAULT_PETS);
  
  // Equip active companion from companionService
  const initialActive = companionService.getActiveCompanion()?.id || 'sydney';
  const [activePetId, setActivePetId] = useState<string>(initialActive);

  // Dynamic Context Overrides (from router or events)
  const [topicOverride, setTopicOverride] = useState<string | undefined>(currentTopic);
  const [contextOverride, setContextOverride] = useState<string | undefined>(contextText);
  const [collectionIdOverride, setCollectionIdOverride] = useState<string | undefined>(collectionId);
  const [documentIdOverride, setDocumentIdOverride] = useState<string | undefined>(documentId);

  const [messages, setMessages] = useState<PetMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm Sydney, your AI study buddy! 🐾 Ask me **anything** — whether you want to break down dense slides, get a quick analogy, quiz your active recall, or ask open-ended questions like in ChatGPT & Gemini!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [followups, setFollowups] = useState<string[]>([
    '💡 Explain with a fun analogy',
    '⚡ Quiz me with 2 quick questions',
    '⚠️ What tricky traps do examiners test?'
  ]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-detect route context if not passed as props
  useEffect(() => {
    if (!currentTopic && !topicOverride) {
      const matchColl = location.pathname.match(/\/collections\/([^/]+)/);
      if (matchColl) {
        const cId = matchColl[1];
        setCollectionIdOverride(cId);
        const cachedTitle = localStorage.getItem(`recall_coll_title_${cId}`);
        if (cachedTitle) setTopicOverride(`Collection: ${cachedTitle}`);
      }

      const matchDoc = location.pathname.match(/\/documents\/([^/]+)/);
      if (matchDoc) {
        setDocumentIdOverride(matchDoc[1]);
      }
    }
  }, [location.pathname, currentTopic, topicOverride]);

  // Sync with pets from API if available
  useEffect(() => {
    api.listPetAssistants()
      .then(res => {
        if (res && res.length > 0) {
          // Merge with DEFAULT_PETS to preserve all personas
          const combined = [...res];
          DEFAULT_PETS.forEach(dp => {
            if (!combined.some(p => p.id === dp.id)) combined.push(dp);
          });
          setPets(combined);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for global chat trigger event
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true);
      if (e.detail?.topic) setTopicOverride(e.detail.topic);
      if (e.detail?.context) setContextOverride(e.detail.context);
      if (e.detail?.collectionId) setCollectionIdOverride(e.detail.collectionId);
      if (e.detail?.documentId) setDocumentIdOverride(e.detail.documentId);
      if (e.detail?.preset) {
        handleSend('', e.detail.preset);
      }
    };

    window.addEventListener('recall:open-study-chat', handleOpenEvent);
    return () => window.removeEventListener('recall:open-study-chat', handleOpenEvent);
  }, []);

  const activePet = pets.find(p => p.id === activePetId) || DEFAULT_PETS[0];

  const handleSelectPet = (pet: PetProfile) => {
    soundManager.playTick();
    setActivePetId(pet.id);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `*Switched to ${pet.name}!* ${pet.avatar} (${pet.breed})\n\n"${pet.tagline}"\n\nI'm ready! Ask me anything about ${topicOverride || 'your study material'}, or explore any general topic you want!`
      }
    ]);
  };

  const handleSend = async (messageText?: string, presetKey?: string) => {
    const text = (messageText !== undefined ? messageText : input).trim();
    if (!text && !presetKey) return;
    if (loading) return;

    soundManager.playTick();
    const promptLabel = text || (PRESETS.find(p => p.id === presetKey)?.label || 'Quick Preset');
    const userMsg: PetMessage = { role: 'user', content: promptLabel };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatWithPet({
        pet_id: activePetId,
        user_message: text || promptLabel,
        current_topic: topicOverride || currentTopic,
        context_text: contextOverride || contextText,
        collection_id: collectionIdOverride || collectionId,
        document_id: documentIdOverride || documentId,
        preset: presetKey,
        chat_history: messages.slice(-6)
      });

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.reply }
      ]);
      soundManager.playCorrect();

      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setFollowups(res.suggested_followups);
      }
    } catch (err: any) {
      console.error("[StudyAssistant] Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `*${activePet.name} checks in:* I had trouble reaching the AI service (${err?.message || 'Connection error'}). Please verify your connection or try again!`
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    soundManager.playTick();
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    soundManager.playTick();
    setMessages([
      {
        role: 'assistant',
        content: `*Chat refreshed!* ✨ I'm ${activePet.name} (${activePet.avatar}). Ask me anything or tap a preset above to explore ${topicOverride || 'your study material'}!`
      }
    ]);
  };

  // ---------------------------------------------------------------------------
  // Lightweight, robust Markdown parser (Headers, Bold, Lists, Code, Quotes)
  // ---------------------------------------------------------------------------
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeBlockLines.join('\n');
          elements.push(
            <div key={`code-${i}`} style={{
              position: 'relative',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              margin: '0.5rem 0',
              fontFamily: 'monospace',
              fontSize: '0.825rem',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => { navigator.clipboard.writeText(codeText); soundManager.playTick(); }}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '8px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-subtle)'
                }}
              >
                Copy
              </button>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{codeText}</pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockLines = [];
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.5rem 0 0.2rem 0', color: 'var(--color-blue)' }}>{parseInline(line.substring(4))}</h4>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={i} style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0', color: 'var(--color-text-main)' }}>{parseInline(line.substring(3))}</h3>);
      } else if (line.startsWith('# ')) {
        elements.push(<h2 key={i} style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0.85rem 0 0.35rem 0' }}>{parseInline(line.substring(2))}</h2>);
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={i} style={{ marginLeft: '1.25rem', marginBottom: '0.25rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {parseInline(line.trim().substring(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(line.trim())) {
        const match = line.trim().match(/^(\d+)\.\s(.*)$/);
        if (match) {
          elements.push(
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800, color: 'var(--color-blue)', flexShrink: 0 }}>{match[1]}.</span>
              <span>{parseInline(match[2])}</span>
            </div>
          );
        }
      } else if (line.trim().startsWith('> ')) {
        elements.push(
          <blockquote key={i} style={{
            borderLeft: '3px solid var(--color-blue)',
            paddingLeft: '0.75rem',
            margin: '0.5rem 0',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            fontSize: '0.85rem'
          }}>
            {parseInline(line.substring(2))}
          </blockquote>
        );
      } else if (!line.trim()) {
        elements.push(<div key={i} style={{ height: '0.35rem' }} />);
      } else {
        elements.push(
          <p key={i} style={{ margin: '0 0 0.4rem 0', fontSize: '0.875rem', lineHeight: 1.55 }}>
            {parseInline(line)}
          </p>
        );
      }
    }

    return elements;
  };

  const parseInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|\$.*?\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={match.index}>{token.substring(2, token.length - 2)}</strong>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={match.index} style={{
            background: 'var(--color-bg)',
            padding: '0.1rem 0.3rem',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.85em',
            border: '1px solid var(--color-border)'
          }}>
            {token.substring(1, token.length - 1)}
          </code>
        );
      } else if (token.startsWith('$') && token.endsWith('$')) {
        parts.push(
          <span key={match.index} style={{
            fontFamily: 'KaTeX_Math, Cambria Math, serif',
            fontStyle: 'italic',
            color: 'var(--color-purple)',
            fontWeight: 600
          }}>
            {token.substring(1, token.length - 1)}
          </span>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => { soundManager.playTick(); setIsOpen(prev => !prev); }}
        className="btn-3d btn-3d-white"
        style={{
          position: 'fixed',
          bottom: '22px',
          right: '22px',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.65rem 1.15rem',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          border: '2px solid var(--color-blue)',
          background: 'var(--color-surface)'
        }}
        title="Open Gemini / ChatGPT Study Companion"
      >
        <span style={{ fontSize: '1.4rem' }}>{activePet.avatar}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-main)', lineHeight: 1.2 }}>
            Ask {activePet.name}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-blue)', fontWeight: 700 }}>
            {topicOverride ? '📚 Grounded in Doc' : '✨ Gemini Study AI'}
          </div>
        </div>
      </button>

      {/* Slide-out Gemini / ChatGPT Style Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 500,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              background: 'var(--color-surface)',
              borderLeft: '2px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 36px rgba(0,0,0,0.25)',
              animation: 'slideIn 0.25s ease-out'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.1rem 1.25rem',
              borderBottom: '1.5px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>{activePet.avatar}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>
                      {activePet.name}
                    </h3>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                      ONLINE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0 0' }}>
                    {activePet.breed} • {activePet.tagline}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handleClearChat}
                  className="btn-3d btn-3d-white"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  title="Start fresh conversation"
                >
                  🔄 New Chat
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.3rem',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '0.2rem'
                  }}
                  title="Close assistant"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scope / Context Pill Banner */}
            <div style={{
              padding: '0.6rem 1.25rem',
              background: 'var(--color-surface-hover)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.8rem' }}>{topicOverride ? '📚' : '🌐'}</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: topicOverride ? 'var(--color-blue)' : 'var(--color-text-subtle)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {topicOverride ? `Scope: ${topicOverride}` : 'General AI Scope — Ask anything!'}
                </span>
              </div>
              {topicOverride && (
                <button
                  onClick={() => { setTopicOverride(undefined); setContextOverride(undefined); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.7rem',
                    color: 'var(--color-text-subtle)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  title="Switch to general chat without doc context"
                >
                  General Mode
                </button>
              )}
            </div>

            {/* Persona Switcher Strip */}
            <div style={{
              padding: '0.6rem 1.25rem',
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              gap: '0.45rem',
              overflowX: 'auto'
            }}>
              {pets.map(p => {
                const isSelected = p.id === activePetId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPet(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isSelected ? 'var(--color-blue)' : 'var(--color-border)'}`,
                      background: isSelected ? 'rgba(28, 176, 246, 0.15)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 800 : 600,
                      whiteSpace: 'nowrap',
                      color: isSelected ? 'var(--color-blue)' : 'var(--color-text-main)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Presets Horizontal Strip */}
            <div style={{
              padding: '0.65rem 1.25rem',
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-subtle)', letterSpacing: '0.5px' }}>
                ⚡ Presets about this material:
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSend('', preset.id)}
                    disabled={loading}
                    className="btn-3d btn-3d-white"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 700
                    }}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Thread Scroll Area */}
            <div style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--color-bg)'
            }}>
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    {!isUser && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.1rem' }}>
                        <span style={{ fontSize: '1rem' }}>{activePet.avatar}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-subtle)' }}>
                          {activePet.name}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        padding: '0.875rem 1.15rem',
                        borderRadius: 'var(--radius-lg)',
                        background: isUser ? 'var(--color-blue)' : 'var(--color-surface)',
                        color: isUser ? '#ffffff' : 'var(--color-text-main)',
                        border: isUser ? 'none' : '1.5px solid var(--color-border)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}
                    >
                      {isUser ? (
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </div>
                      ) : (
                        <div>{renderMarkdown(m.content)}</div>
                      )}

                      {!isUser && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid var(--color-border-subtle, rgba(0,0,0,0.05))', paddingTop: '0.35rem' }}>
                          <button
                            onClick={() => handleCopyMessage(m.content, idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '0.7rem',
                              color: 'var(--color-text-subtle)',
                              cursor: 'pointer'
                            }}
                          >
                            {copiedIndex === idx ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)'
                }}>
                  <span style={{ fontSize: '1.25rem', animation: 'spin 1.5s linear infinite' }}>{activePet.avatar}</span>
                  <span>{activePet.name} is reasoning with Gemini...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Follow-up Prompt Chips */}
            {followups.length > 0 && (
              <div style={{
                padding: '0.5rem 1.25rem',
                display: 'flex',
                gap: '0.45rem',
                overflowX: 'auto',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface)'
              }}>
                {followups.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="btn-3d btn-3d-white"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      borderRadius: 'var(--radius-full)',
                      whiteSpace: 'nowrap',
                      color: 'var(--color-text-subtle)',
                      fontWeight: 700
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1.5px solid var(--color-border)',
              display: 'flex',
              gap: '0.5rem',
              background: 'var(--color-surface)',
              alignItems: 'flex-end'
            }}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={`Ask ${activePet.name} anything (Enter to send, Shift+Enter for new line)...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.875rem',
                  resize: 'none',
                  maxHeight: '120px',
                  fontFamily: 'inherit'
                }}
              />
              <button
                className="btn-3d btn-3d-blue"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                Send 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
