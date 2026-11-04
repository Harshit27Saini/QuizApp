# Recall — AI-Powered Personal Learning Platform

Recall is an open-source, personalized learning platform that transforms user-uploaded learning materials (PDF, DOCX, PPTX, TXT) into an interactive, curriculum-grounded learning experience.

Inspired by Duolingo's bite-sized progression, XP indicators, and immediate feedback loops, Recall focuses on active recall and evidence-backed quizzes without generic chatbot interfaces.

---

## Key Features

- **Document Ingestion:** High-fidelity text extraction preserving page numbers, slide titles, and headings from PDF, DOCX, PPTX, and TXT.
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

