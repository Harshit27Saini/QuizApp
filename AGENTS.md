# AGENTS.md — Persistent Instructions for Coding Agents

This document defines persistent constraints, engineering standards, and architectural rules for all AI coding assistants working on the **Recall** repository.

---

## 1. Core Principles

1. **Maintainability & Clarity:** Prefer simple, readable, modular code over clever abstractions.
2. **Never Break Architecture:**
   - Keep Frontend, Backend, Database, and Services strictly separated.
   - Do not leak AI vendor-specific logic into general business logic.
   - Never bypass the `BaseAIProvider` abstraction.
3. **Zero Secrets in Code:** Never commit or hardcode API keys, service tokens, or credentials. Use `.env` and Pydantic `BaseSettings`.
4. **No Premature Complexity:**
   - Do not introduce graph databases or vector databases until Phase 2.
   - Do not pretend basic LLM prompting is Machine Learning.
   - Do not introduce paid cloud services without founder approval.
5. **No Silent Failures:**
   - Handle extraction and generation errors explicitly.
   - Validate LLM output with Pydantic schemas; reject or retry malformed payloads.
   - Surface actionable error messages to the user.

---

## 2. Technology Guidelines

### Backend (Python / FastAPI)
- Use Python 3.9+ compatible syntax.
- Use **Pydantic v2** for schemas and settings.
- All endpoints must declare explicit response models (`response_model=...`).
- Group endpoints logically under `backend/app/api/v1/`.
- Document processing services must reside in `backend/app/services/document_parser/`.
- AI providers must reside in `backend/app/services/ai/` and implement `BaseAIProvider`.
- Every critical service (parsers, generators, grading) must have automated pytest tests in `backend/tests/`.
- Never claim tests passed without running them.

### Frontend (React / TypeScript / Vite)
- Use standard functional React with TypeScript.
- Strict typing: do not use `any` unless absolutely unavoidable and documented.
- Modular CSS using CSS variables in `src/styles/variables.css`.
- Keep components small, decoupled, and reusable so the founder can redesign them easily.
- Avoid heavy UI component frameworks (MUI, AntD) that lock in visual styling; use clean semantic HTML and modular CSS.
- Frontend API calls should be centralized in `src/services/api.ts` and `src/services/supabase.ts`.

---

## 3. Workflow for Agents

Before implementing a major feature:
1. Explain what needs to be built.
2. Identify affected files.
3. Explain dependencies.
4. Identify potential risks.
5. Implement incrementally and run automated tests.
6. Commit to Git with conventional commit messages (`feat: ...`, `fix: ...`, `test: ...`, `docs: ...`).
7. Update relevant docs in `docs/` if architecture or schemas change.

---

## 4. Documentation Synchronization

Always keep the following documentation files up to date when making changes:
- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/DEVELOPMENT.md`

