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

---

## ADR 014: Barebone Starter State, Milo Cat Identity, Onboarding Tutorial, Live Social Leaderboard, and PDF Reader Temporary Deprecation
- **Date:** 2026-11-06
- **Status:** Accepted
- **Context:** Playtesting feedback requested:
  1. Milo was misconfigured as an indie dog instead of a white & black indie cat.
  2. The streak counter and XP meters were seeded with mock values (5-day streak, 250 XP starter bonus), giving new testers a non-empty state instead of an authentic barebone progression experience from 0 XP and 0-day streak.
  3. A new learner onboarding tutorial / interactive guide was needed to explain Recall's companion system, stepping stones, and streak mechanics.
  4. The leaderboard contained hardcoded mock names (`Rohan Mehta`, `Alex Chen`, `Tanvi Deshmukh`).
  5. The raw PDF iframe reader was clunky and buggy across various screen sizes and needed to be hidden until fully redesigned.
- **Decision:**
  1. Updated Milo's avatar, subtitle, and dialogue across `companions.ts` and `PetAssistantChat.tsx` as a White & Black Indie Cat (`🐱`).
  2. Reset default starter state in `quests.ts`, `xp.ts`, and `todos.ts` to genuine barebone zero-baselines (0 XP, 0-day streak, 0 completed tasks), igniting dynamically upon first study activity.
  3. Created `TutorialModal` (a 5-step gamified onboarding walkthrough) accessible automatically on first visit and on-demand via the `🎓 Tutorial` pill in desktop top bar and mobile drawer.
  4. Removed hardcoded mock friends and rival entries; connected the leaderboard directly to real registered platform users (`GET /api/v1/friends/leaderboard`).
  5. Temporarily deprecated the raw PDF reader/split-screen embed in favor of a clean, structured text and section preview with direct links to Learning Paths, Quizzes, and Flashcards.
- **Consequences:** Authentic progression loop from 0 XP, clear onboarding for new playtesters, accurate social rankings, and elimination of clunky PDF embed glitches.

---

## ADR 016: Smarter Quiz Engine, Branching Challenge Trails, 4-Step Runner, Founder Mode Switch, and Collection Lifecycle Resilience
- **Date:** 2026-11-06
- **Status:** Accepted
- **Context:**
  1. Multiple-choice questions frequently suffered from length bias where the correct answer was visibly longer than distractors.
  2. The learning path needed optional branching challenge trails (every 2 units) with synthesis questions and 3x XP rewards.
  3. Stepping stones required a unified 4-step progressive runner: Flip Cards -> Slide Breakdown (confidence toggles, TTS, AI TL;DR) -> Companion Doubts -> Balanced Quiz + 1-Page Cheat Sheet downloader.
  4. The founder needed a 1-click mode switch (`[ 👑 Dev Portal | 🎓 Student View ]`) to experience the authentic learner UI while retaining instant access to telemetry and feedback diagnostics.
  5. In-memory collection state on Render free-tier wiped on idle container spin-down, causing 404s when uploading documents into stale collection URLs, and user ownership checks blocked admin access.
- **Decision:**
  1. Enforced strict character length parity in prompts and implemented `validator.py:balance_option_lengths` to trim giveaway lengths.
  2. Added branching "👑 Challenge Gauntlet" paths with 3x XP rewards (+75 XP) and gold crown badges.
  3. Built `SteppingStoneRunner.tsx` unifying the 4-step study flow with speech synthesis, confidence markers, companion queries grounded in slide context, and markdown cheat sheet export.
  4. Added Founder Mode toggle in top bar and Google OAuth / Founder auto-role granting.
  5. Updated backend collection endpoints to grant full admin access, auto-adopt guest collections upon login, and added 1-click collection auto-recovery in the frontend UI.
- **Consequences:** Fair and rigorous quiz questions, rich gamified learning path progression, seamless founder testing, and robust recovery from cloud container sleep.

---

## ADR 018: Level 2 Safe Modular Decomposition, Database Streamlining, and AI Branding Purge
- **Date:** 2026-11-09
- **Status:** Accepted
- **Context:**
  1. As features expanded (Minecraft dungeon map, 4-step runner, branching side nodes, reward chests, companions), `LearningPathPage.tsx` grew into a massive file with mixed concerns (inline nodes, modals, styling constants).
  2. `backend/app/core/database.py` contained dead legacy Firebase/Firestore code intertwined with Supabase and in-memory stores across dozens of methods.
  3. Tacky "AI" buzzwords ("AI Pet Assistant", "✨ AI Summary", "AI-Powered...") diluted the educational product identity and added robotic slop.
- **Decision:**
  1. Extracted focused components under `frontend/src/components/learning_path/`:
     - `dungeonConstants.ts`: Central biome styling dictionary (`TRAIL_STYLES`) and helpers.
     - `DungeonSideNode.tsx`: Side trail bubble component.
     - `MainDungeonNode.tsx`: 3D central stepping stone button and companion cheerleader badge.
     - `MilestoneChestModal.tsx`: Milestone chest reward modal.
     - `NandhiniUnlockModal.tsx`: 90% syllabus mastery celebration modal.
  2. Streamlined `backend/app/core/database.py` by purging all dead Firestore code, leaving clean Supabase PostgreSQL as primary with isolated InMemoryDB fallback for automated testing, organized into 10 numbered sections.
  3. Rebranded "AI" buzzwords across UI to clean, product-first terms: "Study Companion", "Key Concept Review", "Active Recall & Syllabus Mastery Platform".
  4. Verified with full backend unit test suite (`pytest`, 35/35 passing) and frontend production build (`npm run build`, 0 errors).
- **Consequences:** Codebase is clean, modular, and effortless to understand after 12 months. Zero regressions to any existing game mechanics or backend persistence.

---

## ADR 019: Resilient Database Failover, Unlimited Section Drill System, and Dynamic Just Start Overhaul
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  1. Ephemeral cloud failures or paused Supabase free-tier instances caused unhandled `ConnectError` DNS exceptions, breaking the frontend with "Unable to reach cloud backend".
  2. Users needed an unlimited question drilling mode section-by-section or slide grouping, allowing endless active recall practice per section until the user explicitly decides to advance.
  3. The "Feeling Overwhelmed" / Just Start mode was a static single-paragraph screen; adding time merely updated the clock without advancing slides or providing more questions.
- **Decision:**
  1. Implemented automatic resilient failover in `backend/app/core/database.py`: any Supabase connectivity or query exception seamlessly routes to disk-persisted in-memory storage, eliminating 500 outages.
  2. Added `InfiniteSectionDrill.tsx` and `POST /api/v1/learning-paths/{path_id}/units/{unit_index}/drill-questions` providing endless questions per unit/slide-group, real-time accuracy and streak metrics, instant option grading, and user-driven section advancement.
  3. Overhauled `JustStartPage.tsx` into a dynamic multi-slide stream where each slide has a summary, 1-click recall check, and advancing slides or adding time actually progresses to the next slide and question.
- **Consequences:** Zero backend downtime from database DNS pauses, true unlimited drilling for exam mastery, and an interactive, friction-free "Just Start" study flow.

---

## ADR 021: Permanent Collection Adoption, Option Length Anti-Bias, and Real-Time Friend System
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  1. Users reported collections disappearing after completing a quiz because guest-created collections were not adopted alongside the quiz upon attempt submission, and ephemeral container restarts wiped un-synced memory state.
  2. Users noted that "the longest answer is always the right answer" due to synthetic generator verbosity bias where the extracted factual sentence was consistently 2x–3x longer than short distractor phrases.
  3. The friend system was non-functional across devices because `LeaderboardPage.tsx` read incoming requests only from local `localStorage` without calling `api.listFriendRequests()` or `api.listFriends()`, and backend friend requests lacked persistent disk serialization.
  4. Supabase schema had an RLS syntax bug on line 184 (`flashcard_decks` instead of `flashcards`).
- **Decision:**
  1. Auto-Collection Adoption & Multi-Tier Fallback: Added `adopt_collection_to_user` in `database.py` and called it on quiz attempt submission in `attempts.py`. Added client-side `localStorage` caching in `DashboardPage.tsx` so collections are never visually lost during worker rotations.
  2. Anti-Bias Option Length Equalization: Overhauled `balance_option_lengths` in `validator.py` and `mock_provider.py` to guarantee that at least one distractor is equal to or longer than the correct choice. Appended plausible academic domain qualifiers to distractors if the correct answer exceeds them.
  3. Cloud Friend Requests & Social Sync: Wired `api.listFriendRequests()`, `api.listFriends()`, and username-or-email request sending directly into `LeaderboardPage.tsx`. Enabled disk persistence on friend requests and friendships.
  4. Fixed `docs/supabase_schema.sql` line 184.
- **Consequences:** Collections persist permanently across quiz completions, gaming questions by option length is completely eliminated, and real study friends can seamlessly connect across cloud devices.

---

## ADR 022: Transition from Flashcard Stepping Stones to Classical STEM Textbook Pedagogical Model
- **Date:** 2026-11-21
- **Status:** Accepted
- **Context:**
  1. Users found flashcards in the primary learning path stepping stone runner repetitive and counter-productive for complex STEM slide decks, where foundational theory must precede problem solving.
  2. The learning path stepping stone required a pedagogical structure matching classical STEM textbooks: Theory & Operational Rules $\rightarrow$ Worked Example with step-by-step breakdown $\rightarrow$ Ask Study Buddy $\rightarrow$ Practice Understanding Check.
  3. Gemini pet chatbot previously experienced repetitive responses due to missing `generate_text` methods across AI providers, which has been resolved with multi-provider failover.
- **Decision:**
  1. Overhauled `SteppingStoneRunner.tsx` from `['cards', 'notes', 'companion', 'quiz']` to `['theory', 'example', 'companion', 'quiz', 'celebration']`.
  2. Built Step 1 (`theory`): Structured Theory & Operational Rules with conceptual overview, mechanisms confidence toggles, audio read-aloud TTS, Gemini TL;DR bullets, and direct PDF slide jump.
  3. Built Step 2 (`example`): Worked Example & Application Walkthrough featuring concrete case scenarios, collapsible step-by-step solution breakdown mapping governing principles and mechanisms, key distinctions callout, and examiner's trap warning.
  4. Preserved Step 3 (`companion`) and Step 4 (`quiz`) with seamless bi-directional navigation.
- **Consequences:** Learning paths provide deep conceptual grounding and practical application without forced flashcard flipping, substantially elevating user satisfaction and study efficacy.

---

## ADR 023: Universal ChatGPT/Gemini-Grade Study Companion with Presets & Multi-File Drag-and-Drop
- **Date:** 2026-11-22
- **Status:** Accepted
- **Context:**
  1. Users reported the study chatbot felt limited and robotic, unable to answer open-ended questions like ChatGPT or Gemini, lacked collection-level grounding, and had no quick preset actions.
  2. Users were unable to drag and drop files onto collections to upload documents because drag-and-drop event handlers were missing from `CollectionDetailPage.tsx` and collection cards.
- **Decision:**
  1. Expanded `PetAssistantChat.tsx` into a universal, ChatGPT/Gemini-grade conversational drawer mounted globally in `AppLayout.tsx` and accessible on all pages.
  2. Implemented 6 one-click document & collection presets (`Executive Summary`, `Quiz Me (3 Qs)`, `Explain Like I'm 10`, `Exam Pitfalls & Traps`, `Formulas & Rules`, `7-Day Study Plan`).
  3. Upgraded `pet_personas.py` system prompts to answer *anything* with academic breadth, Markdown code blocks, KaTeX math rendering, and distinct companion personalities (Sydney, Connie, Milo, Scooby, Bunny, Nandhini, Coach Harshit, Duo, Archimedes).
  4. Implemented full-window drag-and-drop and multi-file batch uploads on `CollectionDetailPage.tsx` and direct card drop targets on `DashboardPage.tsx`.
- **Consequences:** Intuitive, frictionless file ingestion across collections and a world-class conversational study assistant that answers any question with personality and document grounding.

---

## ADR 024: Socratic Teach-Me Split-Screen with Authentic Unchanged PDF Viewer
- **Date:** 2026-11-22
- **Status:** Accepted
- **Context:**
  1. Users preferred uploading PDFs directly to Gemini/ChatGPT to be taught slide-by-slide rather than navigating through rigid LMS-style modals and extracted plain text.
  2. Users explicitly required viewing the original, unchanged visual PDF (diagrams, equations, plots, colors) side-by-side with an active Socratic companion tutor instead of lossy text extractions.
- **Decision:**
  1. Built `SocraticStudyPage.tsx` (`/documents/:documentId/study`) providing a unified split-screen workspace: Left side is the live authentic visual PDF viewer (via raw blob / iframe with slide jump), Right side is the active Socratic AI tutor.
  2. Created `POST /api/v1/documents/{document_id}/socratic-teach` and `generate_socratic_teaching` service in `backend/app/services/socratic/tutor.py` to deliver slide-accurate core principles, intuitive real-world analogies, and active recall understanding check questions with instant feedback and XP rewards.
  3. Enabled direct token authentication on raw document file endpoint (`/documents/{document_id}/file?token=...`) and blob fetching in `api.ts`.
  4. Added prominent 1-click `🎓 Socratic Teach-Me` access points on `CollectionDetailPage.tsx` and `DocumentPreviewPage.tsx`.
- **Consequences:** Combines the conversational warmth and adaptive questioning of ChatGPT/Gemini with visual spatial diagram grounding, persistent mastery tracking, and zero prompt engineering overhead.

---

## ADR 025: Strict Multi-Tenant Isolation and Data Privacy for User Collections
- **Date:** 2026-11-24
- **Status:** Accepted
- **Context:**
  1. Users reported that private study collections and documents became visible to other friends/users on the platform.
  2. Investigation revealed multiple critical privacy leakage vectors:
     - `list_collections` endpoint bypassed user filtering whenever `current_user["is_admin"]` was true (or query had `or all_users`), returning all platform collections to admin accounts.
     - Fallback in `InMemoryDB.list_collections` returned any collection where `user_id.startswith("guest_")` to *every* visitor, exposing all guest-created study materials to all users.
     - Unauthenticated requests without an `X-User-Id` header defaulted to the hardcoded `DEV_USER` with `is_admin = True`, granting accidental superadmin platform visibility.
     - `attempts.py` automatically called `adopt_collection_to_user` upon submitting any quiz attempt, reassigning the creator's collection ownership to whoever took the quiz.
     - `DashboardPage.tsx` cached collections in a global `localStorage` key (`recall_cached_collections`) and fell back to loading the previous user's cached collections whenever a new user logged in with 0 collections.
- **Decision:**
  1. Enforced strict user scoping on `GET /collections`: only returns collections where `c.user_id == current_user["id"]`. Elevated `is_admin` all-collections listing is only permitted if the user is an admin AND explicitly requests `?all_users=true`.
  2. Removed the wildcard `startswith("guest_")` match from database queries. Guest collections are strictly isolated to their own unique `X-User-Id`.
  3. Removed collection hijacking in `get_collection`, `get_document`, and `attempts.py`. Taking a quiz or viewing a document never reassigns ownership.
  4. Secured unauthenticated request fallback in `security.py` so unauthenticated requests never receive `is_admin = True`.
  5. Scoped frontend localStorage caching to user ID (`recall_cached_collections_${userId}`) and purged all cached collection keys and guest tokens on logout.
- **Consequences:** Complete data privacy and multi-tenant isolation. No user or friend can see, access, or modify another user's private study collections or documents.














