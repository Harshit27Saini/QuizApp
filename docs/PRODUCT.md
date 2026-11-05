# Product Specification — Recall

## 1. Vision & Purpose

**Recall** is an AI-powered personalized learning platform that transforms user-uploaded study materials into an active, interactive learning experience.

Rather than acting as a conversational chatbot, Recall functions as a structured learning environment. It breaks down complex study documents into bite-sized concepts, generates curriculum-grounded quizzes, validates user knowledge, and facilitates retention through active recall and targeted error review.

---

## 2. Target Users

- **University & College Students:** Preparing for modular semester exams from dense lecture slides, textbooks, and reading packets.
- **Competitive Examination Candidates:** Reviewing vast syllabi with strict factual recall and high accuracy requirements.
- **High School Students:** Learning subject chapters incrementally with instant feedback and structured mastery.
- **Independent & Professional Learners:** Digesting whitepapers, technical documentation, and certifications.

---

## 3. Core MVP Features

1. **User Accounts & Profiles:**
   - Email/password authentication via Supabase Auth.
   - User profile tracking progress, XP points, and completed sessions.
2. **Study Collections:**
   - Organize documents into logical folders or course collections (e.g. "Biology 101", "Operating Systems").
3. **Document Ingestion, Filtering & Preview:**
   - Support for PDF, DOCX, PPTX, and plain text (`.txt`).
   - Text extraction preserving slide titles, chapter headings, and page boundaries.
   - **Front-Matter & Noise Filtering:** Automatically detects and filters out institutional covers, course codes, table of contents, and dean/founder speeches so only substantive curriculum is studied.
   - Document preview enabling users to read extracted sections and verify text fidelity prior to quiz generation.
4. **Duolingo-Style Progressive Learning Path & Substantive Curriculum:**
   - **Substantive Learn-First Phase:** Synthesizes genuine educational depth (theoretical overview, core mathematical/operational mechanisms, real-world engineering or clinical applications, key distinctions, and exam pitfalls) before testing.
   - **Sandbox Scope & Range Controls:** Select custom slide/page ranges (e.g. Slides 10 to 25) and customize lesson pace (`sprint`, `standard`, `deep_dive`).
   - **Diverse Map Stepping Stones:** Serpentine map featuring Lesson nodes, Case Study / Scenario nodes, and Unit Checkpoints.
   - **Duolingo Mistake Recycling Loop:** Missed practice questions are re-queued to the end of the session, guaranteeing 100% mastery upon completion.
   - **Native Web Audio Synthesizer:** Snappy major-chord chimes on correct answers, subtle low tones on error, and victory fanfares (with instant sound on/off toggle).
5. **AI Pet Study Assistants (Grounded in Gemini):**
   - In-lesson interactive study companions themed around the founder's pets, grounded in the syllabus context:
     - 🐕 **Sydney:** American Golden Retriever — warm, enthusiastic, analogy-driven study buddy.
     - 🐈 **Connie:** Himalayan Persian Cat (white fur with brown textures) — sharp, elegant, mathematically and technically precise.
     - 🐕‍🦺 **Milo:** White & Black Indie Dog — street-smart, pragmatic, focused on practical memory hacks.
     - 🐶 **Scooby:** Grey Lhasa Apso — calm, patient, protective guardian unraveling complex theory.
     - 🐾 **Bunny:** Brown Lhasa Apso — bouncy, playful, high-energy cheerleader.
6. **Interactive Active-Recall Flashcards:**
   - Synthesizes 3D flip study cards with concept prompts, detailed explanations, and source page citations.
   - Card randomization, keyboard navigation (Space to flip, $\leftarrow \rightarrow$ to navigate), and individual card mastery tracking.
6. **Evidence-Backed Quiz Engine:**
   - **STRICT Mode:** Generates questions answerable directly from source text. Requires verifiable text citations and page numbers.
   - **CONCEPTUAL Mode:** Evaluates comprehension and conceptual connections within the source material.
   - **EXAMINATION Mode:** Simulates exam conditions with customizable difficulty and question counts.
   - Configurable question types: Single-select Multiple Choice (MCQ) and Multi-select (MSQ).
   - Uniform option distribution: Programmatic permutation ensures answers are not biased toward option 'A' or 'B'.
7. **Interactive Quiz Experience & Deterministic Grading:**
   - Clean, distraction-free interface with progress indicators.
   - Instant or end-of-session submission with automated, deterministic server-side grading.
   - Explanations highlighting correct answers and quoting source document sections.
8. **Quiz History & Retry Loop:**
   - Review past quiz attempts and historical scores.
   - "Retry Incorrect Questions": 1-click generation of a remediation session containing only questions missed on a previous attempt.
9. **Social Leaderboard, Gold Leagues & Multi-Device Playtesting:**
   - Weekly Gold League with promotion/demotion countdowns, friends-only filters, and +5 XP high-five cheers.
   - Multi-device friend requests via shareable email handles and pending requests drawer.
10. **Playtester Bug Reporter & Founder Inbox (`/admin/feedback`):**
   - In-app 🐞 reporter that automatically captures browser and page context.
   - Dedicated founder triage inbox to resolve bugs, UX notes, and feature requests.
11. **Granular 4–8 Slides/Stepping Stone Curriculum:**
   - Chunks slide decks into 4–8 slides per stone with interactive milestone chests.
   - Backward-compatible re-chunking action for existing paths.

---

## 4. Design Principles

- **Duolingo-Inspired Engagement:** Focus on bite-sized sessions, clear progression, mastery indicators, and instant feedback.
- **No Chatbot Aesthetics:** Avoid generic chat interfaces, purple glows, or ungrounded generative chatter.
- **Design Independence:** The UI is constructed with CSS variables and clean React primitives so the founder can customize the visual identity at will without touching underlying application logic.

