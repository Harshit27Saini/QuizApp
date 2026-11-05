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

---

## ADR 007: Granular Curriculum Chunking (4–8 Slides per Stepping Stone)
- **Date:** 2026-11-05
- **Status:** Accepted
- **Context:** Previous path generation capped units at 5–7 regardless of document size. When studying large slide decks (e.g. 129 slides), learners encountered huge jumps and sparse milestones.
- **Decision:** Implement a granular stepping stone standard where each path node corresponds directly to 4–8 slides (`slides_per_stone = 6` standard, `4` deep dive, `8` sprint). Large documents synthesize 16–25+ stepping stones with milestone chests placed periodically.
- **Consequences:** True slide-by-slide progression, zero skipped material, explicit slide range labeling (e.g. `Slides 1–6`), and manageable cognitive load for long lectures.

---

## ADR 008: Centralized XP Economy & Cheerleader Store
- **Date:** 2026-11-05
- **Status:** Accepted
- **Context:** Learners need tangible incentives to complete tasks, quizzes, and reading sessions. Cheerleader companions should be unlockable via earned XP coins.
- **Decision:** Build a unified XP wallet service (`xpService`) managing spendable XP coins, lifetime totals, inventory power-ups (Streak Freeze, Double XP), and unlocked companions. Connect to a dedicated Shop (`/shop`) and Interactive To-Do List (`/todos`).
- **Consequences:** High motivation, satisfying reward loop with Web Audio fanfares and confetti, and clear gamification economy without external paywalls.

---

## ADR 009: Real-Date Streak Engine with Auto-Armed Freeze Protection
- **Date:** 2026-11-05
- **Status:** Accepted
- **Context:** The previous streak counter used static mock numbers and hardcoded weekday dots. Missed days were not detected or protected by purchased Streak Freezes.
- **Decision:** Implement dynamic calendar date tracking (`historyDates`, `freezeUsedDates`) across an active rolling 7-day Monday–Sunday calendar. When a day is missed, automatically consume an armed Streak Freeze from the user's inventory to keep the streak flame alive without manual intervention.
- **Consequences:** Accurate daily progression, zero false streak resets when shields are held, and clear visual indicators on the calendar.

---

## ADR 010: Social Leaderboard, Backpack Inventory & Midnight Dark Theme
- **Date:** 2026-11-05
- **Status:** Accepted
- **Context:** Playtesters need a way to inspect held items (e.g. Streak Freezes), view weekly rankings against friends, toggle dark mode, and submit bug reports without cluttering the screen.
- **Decision:** 
  1. Create `/inventory` (Backpack) displaying power-ups, armed status, and cheerleaders.
  2. Implement `/leaderboard` (Weekly Gold League) with friend requests, high-fives (+5 XP), and promotion zones.
  3. Introduce a collapsible right sidebar and persistent top utility bar with a high-contrast Duolingo Midnight theme (`[data-theme="dark"]`).
- **Consequences:** Clean responsive workspace with maximized study area and an engaging social playtesting experience.

---

## ADR 011: Multi-User Authentication, Cloud Feedback Inbox & Go-Live Architecture
- **Date:** 2026-11-05
- **Status:** Accepted
- **Context:** Playtesting with real friends requires independent user accounts, cloud bug reporting for the founder, and mutual friend challenges across different devices.
- **Decision:**
  1. Multi-User Auth: Implement lightweight JWT authentication (`/auth/signup`, `/auth/login`, `/auth/me`) with salted SHA-256 password hashing. Automatically inject `Authorization: Bearer <token>` in the frontend client.
  2. Cloud Bug Inbox: Provide an in-app `🐞 Bug` reporter modal and founder inbox (`/admin/feedback`) to review, filter, and resolve playtester feedback.
  3. Friend Request Network: Support multi-device friend requests (`/friends/request`), mutual acceptance, and shareable playtest handles/emails.
  4. 4–8 Slides Re-chunking: Provide an explicit `🔄 Re-chunk` action on learning paths to upgrade existing cached paths to the 22+ granular stepping stones standard.
- **Consequences:** Safe, seamless playtesting with real friends; immediate founder feedback loop; zero vendor lock-in.

---

## ADR 012: Responsive Mobile & Tablet Architecture
- **Date:** 2026-11-06
- **Status:** Accepted
- **Context:** Playtesters study from smartphones (iPhone, Android) and tablets (iPad portrait & landscape). Desktop 3-column layouts without mobile navigation leave mobile learners unable to browse pages, view daily quests, or fit learning paths on 360px screens.
- **Decision:**
  1. Mobile Bottom Navigation: Implement `MobileBottomNav` fixed at the viewport bottom with safe-area insets (`env(safe-area-inset-bottom)`), providing 1-tap navigation across Learn, Backpack, Leagues, To-Do, and a slide-up "More" drawer.
  2. Slide-Over Study Center: On screens `< 1180px`, clicking the top stat pill opens the Study Center (streaks, quests, cheerleader) in an animated slide-up drawer rather than being hidden.
  3. Dynamic Serpentine Path Scaling: Reduce path lateral offsets on `<= 640px` viewports (`[0, 18, 0, -18]` vs `[0, 60, 0, -60]`) and center companion callouts above the node to eliminate horizontal scrolling.
  4. Responsive Reader & Cards Grid: Collapse split-screen reader to 1-column on `< 900px` and set card auto-fit minimums to 250px-260px.
- **Consequences:** Flawless experience on every device size from 320px phones to large desktop monitors.

---

## ADR 013: Developer-Only Access Gate, UI/UX Display Scaling Engine, and Playtester Telemetry
- **Date:** 2026-11-06
- **Status:** Accepted
- **Context:** Playtesting revealed three key operational requirements:
  1. The bug triage inbox and diagnostic tools should only be visible and accessible to the founder/dev (`Harshit27Saini`), not general playtesters.
  2. Diverse student devices (compact phones, tablets, large monitors) require a user-adjustable UI/UX display scale (Compact 88%, Normal 100%, Cozy 115%) to match screen density and eyesight preferences.
  3. Playtesters agreed to share activity logs for diagnostic debugging, requiring a non-blocking telemetry stream to monitor route transitions, quiz completions, and client runtime errors.
- **Decision:**
  1. Founder Developer Access Gate: Restricted `/admin/feedback` and navigation links to verified admin accounts or founder passcode (`recall-founder-2026`). Backend endpoints (`GET /feedback/`, `GET /telemetry/logs`) enforce `get_admin_user` dependency (HTTP 403 for unauthorized users). Added `POST /auth/claim-founder` for frictionless verification across devices.
  2. Dynamic UI/UX Display Scaling: Built `uiScaleService` controlling root font sizing (14px, 16px, 18px) via `data-ui-scale` attribute and accessible toggle in top app bar and mobile menu.
  3. Non-Blocking Playtester Telemetry: Built client-side `telemetry` service capturing page views, quiz finishes, scale changes, and runtime exceptions (`window.onerror`, `unhandledrejection`). Data is persisted in `InMemoryDB` and Firestore, viewable with live filtering in the Founder Dev Portal.
- **Consequences:** Complete privacy for developer tools, customizable readability for every learner, and instant visibility into runtime bugs experienced by testers.





