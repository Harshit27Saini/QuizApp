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
- **State Management:** React Context (`AuthContext`) and local state hooks.
- **Routing:** React Router v6.
- **Styling:** Custom CSS variables (`src/styles/variables.css`) adhering to a token-based system (colors, typography, spacing, border radii).
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

---

## 3. Security Architecture

1. **Authentication:** All protected endpoints require a valid Supabase JWT.
2. **Access Control:** Row Level Security (RLS) in PostgreSQL ensures users can only read and mutate their own collections, documents, quizzes, and attempts.
3. **API Keys:** AI provider keys and service secrets remain strictly on the backend inside environment variables and are never exposed to the client.
4. **Input Sanitization:** Uploaded files are validated against allowed MIME types and size limits (`MAX_UPLOAD_SIZE_MB`).

