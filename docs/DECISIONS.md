# Architectural Decision Records (ADRs) — Recall

## ADR 001: Modular Monolith vs. Microservices
- **Date:** 2026-11-04
- **Status:** Accepted
- **Context:** The founder needs a fast, reliable MVP within a 14-day window. Microservices introduce premature operational overhead, network latency, distributed transactions, and complex deployment.
- **Decision:** Build Recall as a modular monolith: a single backend service with distinct modular packages (`document_parser`, `ai`, `quiz_engine`, `grading`), and a single React single-page frontend.
- **Consequences:** Simple local development, single deployment target, rapid iteration, while maintaining clean boundaries for future extraction if needed.

---

## ADR 002: Backend Document Extraction vs. Client-Side Extraction
- **Date:** 2026-11-04
- **Status:** Accepted
- **Context:** Text extraction from binary document formats (PDF, DOCX, PPTX) must be reliable, fast, and capable of extracting structured metadata (headings, slide numbers, page indices). Client-side WebAssembly solutions (e.g. pdf.js) are heavy, lack uniform support for DOCX/PPTX, and cannot be easily updated without redeploying the client.
- **Decision:** Perform all document extraction on the backend using battle-tested Python libraries (`PyMuPDF`, `python-docx`, `python-pptx`).
- **Consequences:** Consistent extraction quality across all supported platforms, unified sectioning logic, and lightweight client bundles.

---

## ADR 003: Provider-Independent AI Layer with Mock Fallback
- **Date:** 2026-11-04
- **Status:** Accepted
- **Context:** Relying on a single proprietary AI API creates vendor lock-in and blocks local development when users do not yet possess an API key or face rate limits.
- **Decision:** Implement a `BaseAIProvider` abstraction. Support Google Gemini Flash and Groq Cloud, along with a zero-credential `MockAIProvider` for local testing.
- **Consequences:** The application is fully testable and functional offline; switching providers requires changing one environment variable without touching business logic.

---

## ADR 004: Supabase as Unified Backend-as-a-Service
- **Date:** 2026-11-04
- **Status:** Accepted
- **Context:** The project requires PostgreSQL, user authentication, and secure file storage with zero infrastructure cost during development.
- **Decision:** Use Supabase's generous free tier for PostgreSQL, Auth, and Storage.
- **Consequences:** Eliminates the need to maintain separate Auth0, S3, and RDS accounts. Local development can operate against Supabase or offline mocks.

---

## ADR 005: Styling via CSS Variables over Heavy Component Libraries
- **Date:** 2026-11-04
- **Status:** Accepted
- **Context:** The founder intends to design the UI personally and wants full control over the visual identity without fighting opinionated CSS frameworks (like Tailwind utility bloat or rigid Material UI styling).
- **Decision:** Build reusable, semantic React components powered by a clean CSS design token file (`src/styles/variables.css`).
- **Consequences:** The founder can change themes, fonts, colors, and layout aesthetics directly by tweaking CSS variables without altering React component logic.



---

## ADR 006: Migration from Supabase to Firebase
- **Date:** 2026-11-04
- **Status:** Accepted
- **Context:** The founder raised concerns regarding Supabase's free tier inactivity policy (free projects pause after 7 days of inactivity, causing connection drops for learners until manually unpaused). Additionally, the founder has prior experience with Firebase.
- **Decision:** Migrate authentication, storage, and persistence integrations from Supabase to Firebase (Firebase Auth, Cloud Firestore, and Cloud Storage).
- **Consequences:** Eliminates project dormancy/sleep risk, leverages generous 5GB storage, avoids vendor unfamiliarity, and retains clean database abstraction for offline local development.
