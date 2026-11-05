# Product Roadmap — Recall

## Phase 1: MVP (Target: 14 Days) — CORE SYSTEM IMPLEMENTED
*Goal: Usable, reliable active-recall learning application for real students.*

- [x] Architecture design & documentation suite
- [x] Backend foundation (FastAPI, Pydantic, security guard)
- [x] Supabase PostgreSQL schema & migration scripts
- [x] Document parser service (PDF via PyMuPDF, DOCX, PPTX, TXT)
- [x] Document preview endpoint & UI (inspect extracted sections)
- [x] Provider-independent AI abstraction (Mock, Gemini Flash, Groq)
- [x] STRICT & CONCEPTUAL quiz generation (MCQ & MSQ)
- [x] Programmatic option shuffling (eliminates option a/b bias)
- [x] Granular question count control (1-25 questions + presets)
- [x] Interactive Learning Flashcards with 3D flip & mastery tracking
- [x] Front-matter and institutional noise filtering (filters cover pages, founder speeches, and indices)
- [x] Duolingo-style progressive learning path with substantive theory & mistake recycling
- [x] Duolingo-themed interactive PDF & Document Reader with 5-color highlighters, sticky notes, and companion AI
- [x] Sandbox Scope controls (custom slide/page ranges & depth: sprint, standard, deep dive)
- [x] AI Pet Study Assistants (Sydney, Connie, Milo, Scooby, Bunny) powered by Gemini
- [x] Zero-dependency Web Audio synthesizers (correct chimes, soft error tones, victory fanfare)
- [x] Firebase integration (Auth, Firestore, Cloud Storage)
- [x] Interactive quiz-taking flow with real-time progress
- [x] Server-side deterministic grading with source citations
- [x] Quiz history & "Retry Incorrect Questions" loop
- [x] Clean responsive frontend using CSS variables
- [x] Automated test suite (23/23 unit & E2E tests passing)

---

## Phase 2: Post-MVP & Enhanced Formats
*Goal: Broaden question formats, document coverage, and examination simulations.*

- [x] Timed Examination Hall Simulator:
  - Strict countdown timer with auditory time-critical feedback
  - Configurable negative marking (-0.25 / -0.33 marks per incorrect answer)
  - Interactive Question Palette drawer (Answered, Flagged, Unattempted)
  - Official university examination scorecard with net scaled scores and pass/fail verdict
- [x] Scientific Spaced Repetition (SuperMemo SM-2) on flashcards with dynamic review intervals & "Due for Review Today" filter
- [x] Daily Quests & Streaks Gamification (Daily challenges, Daily Chest XP reward, and Streak Freeze shield)
- [x] Gated Endgame Companion: Nandhini locked behind 90% syllabus mastery with victory unlock ceremony
- [x] ADHD-Friendly "Just Start Mode":
  - "I don't feel like studying" low-activation energy button
  - Auto-selects 1 single bite-sized micro-task (e.g. 3 micro-cards, 1 short paragraph, or 30s breather)
  - Calming 5-minute timer with "Make it even smaller" button
  - Zero-dependency Web Audio ambient focus generator (Soft Rain pink noise & Lo-Fi focus drone)
  - Guilt-free finish screen: exit with pride or ride the momentum (+5 mins)
- [x] Supercharged PDF Study Reader:
  - 3-Way Mode (Interactive Reader, Split-Screen PDF + Notes, Raw PDF)
  - Instant Flashcard Creation from text highlights
  - Smart AI Page Summaries with core thesis, mechanism & exam triggers
  - Pinned Marginalia / Sticky Notes
  - Exam Readiness Heatmap on page navigation
- [x] Granular 4–8 Slides/Stone Learning Paths:
  - Strict 4–8 slides per stepping stone chunking formula
  - Synthesizes 16–25+ stepping stones for large slide decks (e.g. 129 slides)
  - Periodic Milestone Reward Chests along serpentine path
  - Explicit slide range labeling (`Slides 1–6`, etc.)
- [x] Interactive Study To-Do List & Action Plan:
  - Bite-sized study goals with category tags (📑 Slides, ⚡ Quiz, 📖 Reading, 🔁 Review)
  - Auto-chunking generator that breaks 129 slides into 4–8 slide tasks
  - Completing tasks rewards spendable XP coins (+10 to +25 XP) with sound chimes and confetti
- [x] Centralized XP Economy & Cheerleader Shop:
  - Unified XP wallet tracking spendable balance and lifetime earnings
  - Storefront to redeem XP coins for companions (Sydney, Connie, Milo, Scooby, Bunny, Duo Owl, Archimedes)
  - Power-up shields: Streak Freeze Shield, 2X XP Booster Potion, Exam Espresso
  - Real-time event broadcasting updating header and sidebar XP meters across the entire app
- [x] Backpack & Power-Up Inventory System (`/inventory`):
  - Dedicated backpack view for held items (Streak Freeze Shields, 2X XP Potions, Exam Espressos)
  - Auto-armed shield protection status and 30-minute live double XP countdown timer
  - 1-click Cheerleader equip/switch manager
- [x] Real-Date Streak Engine & Dynamic Rolling Calendar:
  - Genuine ISO calendar tracking replacing static mock streaks
  - Dynamic 7-day Monday–Sunday calendar with real studied and freeze-protected days
  - Automatic Streak Freeze consumption preserving streaks upon missed study days
- [x] Interactive Daily Quests & 1-Click Task Jump:
  - Clickable quest cards with full objective explanation and XP rewards
  - Direct 1-click shortcuts into Document Reader, Learning Path, and Exam Simulator
- [x] Weekly Leaderboards, Leagues & Friend Requests (`/leaderboard`):
  - Weekly Gold League with promotion/demotion zones and season reset countdown
  - Global vs. Friends-only ranking filters
  - Friend search, request accept/decline, and high-five (+5 XP) cheer interactions
- [x] Collapsible / Dropdown Right Sidebar & Maximized Study Feed:
  - Top floating utility bar with stat pill (`⚡ XP • 🔥 Streak • 🐾 Companion ▾`)
  - Smooth collapse/expand chevrons expanding center study feed up to 1080px for reading
- [x] System-Wide Midnight Dark Mode:
  - High-contrast Duolingo Midnight theme (`#0b0f19` bg, `#151d30` surface, `#26334d` border)
  - Persistent one-click 🌙 / ☀️ toggle in top bar
- [x] Playtester Bug Reporter & Founder Bug Inbox (`/admin/feedback`):
  - Floating/header 🐞 bug button with automatic page context and client capture for playtesters
  - Dedicated founder portal to review, filter by category (bug, idea, ux), and resolve feedback
- [x] Multi-User Authentication & Friend Network:
  - Multi-user signup and login dialog (`AuthModal`) with salted password hashing and JWT
  - Shareable playtest handle/email copy button on `/leaderboard`
  - Mutual friend request sending, acceptance, and high-five cheering (+5 XP)
- [x] 4–8 Slides/Stepping Stone Re-chunker:
  - Automated detection and banner for older 5-node paths
  - 1-click re-chunk action yielding ~22 granular stones for 129 slides with milestone chests
- [x] Full Mobile & Tablet Responsiveness:
  - Fixed mobile bottom navigation (`MobileBottomNav`) with safe-area insets
  - Slide-over mobile drawer for Study Center (streaks, quests, cheerleader) on screens `< 1180px`
  - Dynamic serpentine stepping stone scaling and centered companion callouts for 360px phones
  - Single-column adaptive document reader and fluid card grids
- [ ] OCR integration (Tesseract / EasyOCR) for scanned PDFs and handwritten notes
- [ ] Additional question formats:
  - Fill in the blanks
  - True / False
  - Matching pairs
  - Numerical problem solving with unit checking
- [ ] Export quizzes to PDF and Anki flashcard format (`.apkg`)

---

## Phase 3: Knowledge Graph & Retrieval
*Goal: Cross-document concept linking and intelligent content chunk retrieval.*

- [ ] Relational Knowledge Graph (Concepts, Definitions, Prerequisites)
- [ ] Cross-document concept linking across study collections
- [ ] Vector embeddings with `pgvector` for semantic search across large collections
- [ ] Hybrid search (BM25 keyword + dense semantic vector)

---

## Phase 4: Machine Learning & Knowledge Tracing
*Goal: Scientifically grounded adaptive personalization.*

- [ ] Bayesian Knowledge Tracing (BKT) to estimate learner concept mastery
- [ ] Item Response Theory (IRT) for calibrated question difficulty
- [ ] Spaced Repetition scheduling (SM-2 / FSRS algorithms)
- [ ] Local model execution via Ollama (Llama 3 / Mistral) for privacy-sensitive learners
