# Recall — AI-Powered Personal Learning Platform

Recall is an open-source, personalized learning platform that transforms user-uploaded learning materials (PDF, DOCX, PPTX, TXT) into an interactive, curriculum-grounded learning experience.

Inspired by Duolingo's bite-sized progression, XP indicators, and immediate feedback loops, Recall focuses on active recall and evidence-backed quizzes without generic chatbot interfaces.

---

## Key Features

- **Document Ingestion:** High-fidelity text extraction preserving page numbers, slide titles, and headings from PDF, DOCX, PPTX, and TXT.
- **Granular 4–8 Slides/Stone Learning Paths:** Transforms 129-slide decks into 16–25+ bite-sized stepping stones (4–8 slides per stone) with substantive theory, practice quizzes, and periodic milestone chests.
- **Study To-Do Queue & Action Plan:** Micro-task study checklist that auto-chunks long slide decks into manageable daily tasks with +10 to +25 XP rewards.
- **Centralized XP Economy & Cheerleader Shop:** Earn spendable XP coins through study milestones, to-do completion, and quizzes to unlock companions (Sydney, Connie, Milo, Scooby, Bunny, Duo Owl, Archimedes) and streak freeze power-ups.
- **Mobile & Tablet Optimized:** Native Duolingo-style bottom navigation bar, safe-area inset support, slide-up study center drawers, and responsive serpentine paths designed for iPhones, Android, and iPads.
- **User-Adjustable UI/UX Display Scale:** One-tap display scaling (Compact 88%, Normal 100%, Cozy 115%) in top bar and mobile menu adapting typography and touch targets to personal eyesight and screen sizes.
- **Developer Access Gate & Founder Triage Hub:** Restricted `/admin/feedback` and Dev Hub nav links protected by founder verification and passcode gate (`recall-founder-2026`).
- **Live Playtester Diagnostics & Telemetry:** Non-blocking telemetry ingestion logging page routes, quiz completions, and client runtime errors with real-time founder activity timeline and JSON export.
- **Backpack Inventory & Auto-Armed Streak Freeze:** Dedicated `/inventory` page managing held shields, 30-minute 2X XP boosters, and cheerleaders. Missed study days are auto-protected by held Streak Freezes.
- **Weekly Leagues & Social Leaderboards:** Compete in the weekly Gold League (`/leaderboard`), filter by friends, send friend requests, copy your shareable playtest handle, and exchange +5 XP High-Five cheers.
- **Collapsible Study Center & Midnight Dark Mode:** One-click dark mode toggle (🌙 / ☀️), interactive daily quests with 1-click jump shortcuts, and a collapsible right sidebar that expands the center reading feed up to 1080px.
- **In-App Playtester Bug Reporter & Founder Inbox:** Built-in 🐞 feedback tool capturing page context so friends can report bugs, and a dedicated founder inbox (`/admin/feedback`) to review, filter, and resolve reports.
- **Multi-User Playtester Accounts:** Full JWT authentication modal (`AuthModal`) with salted password hashing, enabling friends on different devices to create accounts, earn XP, and connect.
- **Supercharged PDF Reader:** 3-way reader with 5-color Duolingo highlighters, sticky marginalia notes, 1-click flashcard maker, and AI page summaries.
- **ADHD Just Start Mode:** 5-minute gentle timer with one tiny micro-task and ambient audio generator (Soft Rain & Lo-Fi drone).
- **Document Preview:** Inspect and verify extracted text and structural sections before quiz generation.
- **Evidence-Backed Quiz Engine:**
  - **STRICT Mode:** Questions are strictly answerable from the document, mandating source citations and quotes.
  - **CONCEPTUAL Mode:** Tests understanding, synthesis, and relationships between concepts.
  - Configurable question counts, difficulty levels, and question types (MCQ and MSQ).
- **Interactive Quiz Interface:** Fast, distraction-free test-taking flow with instant grading, explanations, and direct document citations.
- **Retry Incorrect Questions:** Focused review sessions targeting only questions answered incorrectly in previous attempts.
- **Provider-Independent AI Architecture:** Clean abstraction supporting Google Gemini, Groq, local Ollama, and a zero-dependency Mock provider for offline testing.
- **Zero-Cost & Free-Tier First:** Fully functional with free-tier infrastructure (Supabase Free Tier, Google AI Studio Gemini Flash).

---

## Technology Stack

- **Frontend:** React, TypeScript, Vite, CSS Variables (modular, redesign-friendly design system).
- **Backend:** Python 3.9+, FastAPI, Pydantic v2, PyMuPDF (fitz), python-docx, python-pptx.
- **Database & Auth:** Supabase PostgreSQL & Supabase Auth.
- **Storage:** Supabase Storage.
- **AI Integrations:** Google Gemini Flash (structured outputs) / Groq Llama 3 / Offline Mock.

---

## Project Structure

```
QuizApp/
├── backend/          # FastAPI REST API & document processing engine
├── frontend/         # React + TypeScript + Vite web application
├── docs/             # Product, Architecture, Database, Roadmap, and Decision docs
├── supabase/         # PostgreSQL schema migrations
├── AGENTS.md         # Persistent instructions for AI coding assistants
└── README.md         # Project overview
```

---

## Quickstart

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 3. Running Automated Tests
```bash
cd backend
pytest
```

---

## Documentation

- [Product Vision & Requirements](docs/PRODUCT.md)
- [Architecture & Design](docs/ARCHITECTURE.md)
- [Database Schema & Migrations](docs/DATABASE.md)
- [Architecture Decisions (ADRs)](docs/DECISIONS.md)
- [Roadmap & Release Plan](docs/ROADMAP.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [AI Coding Agent Guidelines](AGENTS.md)

