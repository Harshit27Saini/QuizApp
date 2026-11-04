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

- [ ] OCR integration (Tesseract / EasyOCR) for scanned PDFs and handwritten notes
- [ ] Additional question formats:
  - Fill in the blanks
  - True / False
  - Matching pairs
  - Numerical problem solving with unit checking
- [ ] Timed Examination Mode:
  - Negative marking configuration
  - Configurable pass/fail thresholds
  - Full session result analysis
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
