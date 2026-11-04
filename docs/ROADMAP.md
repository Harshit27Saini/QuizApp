# Product Roadmap — Recall

## Phase 1: MVP (Target: 14 Days) — IN PROGRESS
*Goal: Usable, reliable active-recall learning application for real students.*

- [x] Architecture design & documentation suite
- [ ] Backend foundation (FastAPI, Pydantic, security guard)
- [ ] Supabase PostgreSQL schema & migration scripts
- [ ] Document parser service (PDF via PyMuPDF, DOCX, PPTX, TXT)
- [ ] Document preview endpoint & UI (inspect extracted sections)
- [ ] Provider-independent AI abstraction (Mock, Gemini Flash, Groq)
- [ ] STRICT & CONCEPTUAL quiz generation (MCQ & MSQ)
- [ ] Interactive quiz-taking flow with real-time progress
- [ ] Server-side deterministic grading with source citations
- [ ] Quiz history & "Retry Incorrect Questions" loop
- [ ] Clean responsive frontend using CSS variables

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
