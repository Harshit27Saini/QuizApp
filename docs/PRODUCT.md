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
3. **Document Ingestion & Preview:**
   - Support for PDF, DOCX, PPTX, and plain text (`.txt`).
   - Text extraction preserving slide titles, chapter headings, and page boundaries.
   - Document preview enabling users to read extracted sections and verify text fidelity prior to quiz generation.
4. **Evidence-Backed Quiz Engine:**
   - **STRICT Mode:** Generates questions answerable directly from source text. Requires verifiable text citations and page numbers.
   - **CONCEPTUAL Mode:** Evaluates comprehension and conceptual connections within the source material.
   - Configurable question types: Single-select Multiple Choice (MCQ) and Multi-select (MSQ).
   - Configurable question volume (e.g., 5, 10, 15) and difficulty levels (Easy, Medium, Hard).
5. **Interactive Quiz Experience:**
   - Clean, distraction-free interface with progress indicators.
   - Instant or end-of-session submission with automated, deterministic grading.
   - Explanations highlighting correct answers and quoting source document sections.
6. **Quiz History & Retry Loop:**
   - Review past quiz attempts and historical scores.
   - "Retry Incorrect Questions": 1-click generation of a remediation session containing only questions missed on a previous attempt.

---

## 4. Design Principles

- **Duolingo-Inspired Engagement:** Focus on bite-sized sessions, clear progression, mastery indicators, and instant feedback.
- **No Chatbot Aesthetics:** Avoid generic chat interfaces, purple glows, or ungrounded generative chatter.
- **Design Independence:** The UI is constructed with CSS variables and clean React primitives so the founder can customize the visual identity at will without touching underlying application logic.

