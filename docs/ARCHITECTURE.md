# System Architecture — Recall

## 1. Architectural Overview

Recall is designed as a **Modular Monolith** with a decoupled single-page application frontend and a stateless REST backend.

```
+-------------------------------------------------------------------------+
|                                FRONTEND                                 |
|            React (TypeScript + Vite) + Pure CSS Variables               |
+-------------------+--------------------------------+--------------------+
                    |                                |
       Supabase Auth & Direct Storage           Bearer JWT REST Calls
                    |                                |
                    v                                v
+------------------------------------+   +--------------------------------+
|          SUPABASE CLOUD            |   |        FASTAPI BACKEND         |
|  - Auth (Supabase GoTrue)          |   |  - JWT Auth Guard              |
|  - Storage Bucket (Raw files)      |   |  - Document Extraction Engine  |
|  - PostgreSQL Database             |<--+  - AI Quiz Engine & Validator  |
+------------------------------------+   |  - Deterministic Grading Engine|
                                         +---------------+----------------+
                                                         |
                                             Abstract AI Interface
                                                         |
                                                         v
                                         +--------------------------------+
                                         |       AI PROVIDER LAYER        |
                                         |  - GeminiFlashProvider         |
                                         |  - GroqProvider                |
                                         |  - MockAIProvider (Offline)    |
                                         +--------------------------------+
```

---

## 2. Component Breakdown

### Frontend (`frontend/`)
- **Technology:** React 18, TypeScript, Vite.
- **Layout:** Production 3-Column Duolingo Architecture with Adaptive Mobile/Tablet Modes:
  - **Left Sidebar:** Sticky navigation (Learn, History, Companions, Bug Inbox) on desktop; transitions to `MobileBottomNav` on mobile (`<= 768px`).
  - **Center Feed:** Serpentine 3D stepping stone quest path, substantive study stage, and practice runner.
  - **Right Sidebar & Mobile Drawer:** Sticky Daily Streak flame, circular SVG Daily Goal XP ring, and Active Companion showcase on desktop; opens as a slide-up drawer on mobile/tablets (`< 1180px`).
- **Visual Design System:** Duolingo-grade tactile 3D buttons (`btn-3d`, depressing on active state with bottom border depth), `#58cc02` emerald, `#1cb0f6` cobalt, `#ffc800` gold, `#ff4b4b` coral.
- **Companions & Particle FX:** VIP Girlfriend Nandhini & Founder cheerleaders, the 5 Pet study squad (Sydney, Connie, Milo, Scooby, Bunny), and zero-dependency HTML5 canvas confetti explosions.
- **Routing:** React Router v6.
- **Communication:**
  - Supabase JS Client: handles user sign-in/up and raw document uploads to Supabase Storage.
  - API Client (`src/services/api.ts`): calls FastAPI endpoints with the user's Supabase access token in the `Authorization: Bearer <token>` header.

### Backend (`backend/`)
- **Technology:** Python 3.9+, FastAPI, Pydantic v2.
- **Authentication:** `core/security.py` verifies the incoming Supabase JWT (supports local development bypass/mock mode).
- **Document Processing:**
  - `PyMuPDF` (`fitz`): High-speed PDF text and page boundary extraction.
  - `python-docx`: DOCX parsing preserving headings and paragraphs.
  - `python-pptx`: PowerPoint slide text and shape extraction.
  - `sectionizer.py`: Chunks extracted text into logical sections with associated page numbers and headings.
- **AI Provider Abstraction:**
  - `BaseAIProvider`: Abstract interface defining `generate_quiz(prompt, response_schema) -> dict`.
  - `GeminiProvider`: Google Gemini Flash integration using structured JSON schema.
  - `GroqProvider`: Groq Cloud (Llama 3.3) integration using JSON mode.
  - `MockAIProvider`: Zero-dependency local mock that parses source sections and outputs valid, schema-compliant questions with real quotes for offline testing.
- **Grading & Scoring:**
  - Deterministic validation in `services/grading/scorer.py`. Correct answers are never sent to the client during active quiz sessions; evaluation is performed on the server.
- **Multi-User Playtester Network & Feedback Services:**
  - Salted SHA-256 password hashing + HS256 JWT access tokens (`api/v1/auth.py`).
  - Developer-only access gate (`core/security.py:get_admin_user`, `POST /auth/claim-founder` with founder passcode).
  - Playtester bug report routing & Founder triage dashboard (`api/v1/feedback.py`, `/admin/feedback`).
  - Non-blocking telemetry ingestion and diagnostics (`api/v1/telemetry.py`, `POST /telemetry/log`, `GET /telemetry/logs`).
  - Real-time friend request invitation and high-five cheer bus (`api/v1/friends.py`).
  - Client-side responsive UI scaling engine (`services/uiScale.ts`, `data-ui-scale: compact | default | cozy`).

---

## 3. Security Architecture

1. **Authentication:** All protected endpoints require a valid Supabase JWT.
2. **Access Control:** Row Level Security (RLS) in PostgreSQL ensures users can only read and mutate their own collections, documents, quizzes, and attempts.
3. **API Keys:** AI provider keys and service secrets remain strictly on the backend inside environment variables and are never exposed to the client.
4. **Input Sanitization:** Uploaded files are validated against allowed MIME types and size limits (`MAX_UPLOAD_SIZE_MB`).

