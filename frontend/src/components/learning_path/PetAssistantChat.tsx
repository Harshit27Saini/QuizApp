import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { PetProfile, PetMessage } from '../../types';

interface PetAssistantChatProps {
  currentTopic?: string;
  contextText?: string;
}

const DEFAULT_PETS: PetProfile[] = [
  {
    id: 'sydney',
    name: 'Sydney',
    breed: 'American Golden Retriever',
    avatar: '🐕',
    tagline: 'Endlessly enthusiastic & loyal study buddy!',
    style: 'Warm, encouraging, and upbeat with friendly analogies.'
  },
  {
    id: 'connie',
    name: 'Connie',
    breed: 'Himalayan Persian Cat (White Fur & Brown Textures)',
    avatar: '🐈',
    tagline: 'Elegant, razor-sharp & intellectually precise.',
    style: 'Polite, dignified, and meticulous with technical definitions.'
  },
  {
    id: 'milo',
    name: 'Milo',
    breed: 'White & Black Indie Dog',
    avatar: '🐕‍🦺',
    tagline: 'Street-smart, practical & no-nonsense.',
    style: 'Clever, direct, and focused on practical memory hacks.'
  },
  {
    id: 'scooby',
    name: 'Scooby',
    breed: 'Grey Lhasa Apso',
    avatar: '🐶',
    tagline: 'Calm, patient & wise companion.',
    style: 'Patient and protective, breaking down complex stress.'
  },
  {
    id: 'bunny',
    name: 'Bunny',
    breed: 'Brown Lhasa Apso',
    avatar: '🐾',
    tagline: 'Bouncy, playful & cheerful cheerleader!',
    style: 'Lively, high-energy booster celebrating your breakthroughs.'
  }
];

export const PetAssistantChat: React.FC<PetAssistantChatProps> = ({
  currentTopic,
  contextText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pets, setPets] = useState<PetProfile[]>(DEFAULT_PETS);
  const [activePetId, setActivePetId] = useState<string>('sydney');
  const [messages, setMessages] = useState<PetMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Sydney, your golden study buddy! 🐾 If any concept, formula, or mechanism in this unit feels dense, ask me and I'll break it down for you!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [followups, setFollowups] = useState<string[]>([
    '🐾 Explain this simply',
    '🐾 Give an intuitive real-world example',
    '🐾 What is the core mechanism here?'
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listPetAssistants()
      .then(res => {
        if (res && res.length > 0) setPets(res);
      })
      .catch(() => {
        // Fall back to DEFAULT_PETS
      });
  }, []);

  const activePet = pets.find(p => p.id === activePetId) || pets[0];

  const handleSelectPet = (pet: PetProfile) => {
    setActivePetId(pet.id);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `*Switched to ${pet.name}!* ${pet.avatar} (${pet.breed}) — "${pet.tagline}" Ready to examine ${currentTopic || 'this material'}!`
      }
    ]);
  };

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    const userMsg: PetMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatWithPet({
        pet_id: activePetId,
        user_message: text,
        current_topic: currentTopic,
        context_text: contextText,
        chat_history: messages.slice(-4)
      });

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.reply }
      ]);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setFollowups(res.suggested_followups);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `*${activePet.name} nudges your hand.* Based on ${currentTopic || 'this topic'}, remember that the system relies on comparing inputs with target outputs to maintain stability!`
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface)',
          border: '2px solid var(--color-primary)',
          color: 'var(--color-text-main)',
          fontWeight: 800,
          fontSize: '0.95rem',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)'
        }}
      >
        <span style={{ fontSize: '1.4rem' }}>{activePet.avatar}</span>
        <span>Study with {activePet.name}</span>
        <span className="badge badge-mode" style={{ fontSize: '0.75rem' }}>AI</span>
      </button>

      {/* Slide-out Drawer Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 150,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              height: '100%',
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideIn 0.25s ease-out'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>{activePet.avatar}</span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    {activePet.name}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    {activePet.breed}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Pet Selector Strip */}
            <div style={{
              padding: '0.75rem 1.25rem',
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              gap: '0.5rem',
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
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: isSelected ? 800 : 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Message Thread */}
            <div style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '0.875rem 1.125rem',
                    borderRadius: 'var(--radius-md)',
                    background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: m.role === 'user' ? '#ffffff' : 'var(--color-text-main)',
                    border: m.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div style={{
                  alignSelf: 'flex-start',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)'
                }}>
                  {activePet.avatar} {activePet.name} is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Follow-up Prompts */}
            <div style={{
              padding: '0.5rem 1.25rem',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface)'
            }}>
              {followups.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  style={{
                    padding: '0.375rem 0.625rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    color: 'var(--color-text-muted)',
                    fontWeight: 600
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <input
                type="text"
                placeholder={`Ask ${activePet.name} anything about this topic...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.875rem'
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                style={{ padding: '0.625rem 1rem' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
