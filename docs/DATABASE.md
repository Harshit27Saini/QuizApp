# Database Schema & Migrations — Recall

## 1. Overview

Recall utilizes **PostgreSQL** hosted on Supabase.
All data is user-scoped and protected by foreign keys referencing `auth.users(id)` and PostgreSQL Row Level Security (RLS).

---

## 2. Entity Relationship Diagram

```
[auth.users] (Supabase Auth)
     | 1:1
[profiles]
     | 1:N
[collections]
     | 1:N
[documents] ─────── 1:N ─────── [document_sections]
     |
     | M:N (quiz_documents)
     v
[quizzes] ───────── 1:N ─────── [questions]
     |                               |
     | 1:N                           | 1:N
     v                               v
[quiz_attempts] ─── 1:N ─── [question_responses]
```

---

## 3. Table Specifications

### `profiles`
Mirrors Supabase `auth.users`. Tracks learner progression and XP.
- `id`: UUID (PK, FK `auth.users.id` ON DELETE CASCADE)
- `email`: TEXT NOT NULL
- `display_name`: TEXT
- `xp`: INTEGER NOT NULL DEFAULT 0
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

### `collections`
User study collections (e.g. subjects, courses, books).
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `user_id`: UUID (FK `profiles.id` ON DELETE CASCADE)
- `title`: TEXT NOT NULL
- `description`: TEXT
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

### `documents`
Uploaded study files.
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `collection_id`: UUID (FK `collections.id` ON DELETE CASCADE)
- `user_id`: UUID (FK `profiles.id` ON DELETE CASCADE)
- `filename`: TEXT NOT NULL
- `file_type`: TEXT NOT NULL ('pdf', 'docx', 'pptx', 'txt')
- `file_size_bytes`: BIGINT NOT NULL
- `storage_path`: TEXT NOT NULL
- `total_pages`: INTEGER DEFAULT 1
- `status`: TEXT NOT NULL DEFAULT 'uploaded' ('uploaded', 'processing', 'ready', 'failed')
- `error_message`: TEXT
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

### `document_sections`
Extracted text chunks preserving page numbers and headings.
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `document_id`: UUID (FK `documents.id` ON DELETE CASCADE)
- `section_index`: INTEGER NOT NULL
- `page_number`: INTEGER
- `heading`: TEXT
- `content`: TEXT NOT NULL
- `token_estimate`: INTEGER
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

### `quizzes`
Generated quiz instances.
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `user_id`: UUID (FK `profiles.id` ON DELETE CASCADE)
- `collection_id`: UUID (FK `collections.id` ON DELETE SET NULL)
- `title`: TEXT NOT NULL
- `mode`: TEXT NOT NULL DEFAULT 'STRICT' ('STRICT', 'CONCEPTUAL')
- `difficulty`: TEXT NOT NULL DEFAULT 'medium' ('easy', 'medium', 'hard')
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

### `quiz_documents`
Join table connecting quizzes to source documents.
- `quiz_id`: UUID (FK `quizzes.id` ON DELETE CASCADE)
- `document_id`: UUID (FK `documents.id` ON DELETE CASCADE)
- PRIMARY KEY (`quiz_id`, `document_id`)

### `questions`
Generated questions linked to source documents.
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `quiz_id`: UUID (FK `quizzes.id` ON DELETE CASCADE)
- `question_type`: TEXT NOT NULL DEFAULT 'MCQ' ('MCQ', 'MSQ')
- `prompt`: TEXT NOT NULL
- `options`: JSONB NOT NULL (e.g. `[{"id": "a", "text": "Option 1"}, ...]`)
- `correct_answers`: JSONB NOT NULL (e.g. `["a"]` or `["a", "b"]`)
- `explanation`: TEXT NOT NULL
- `source_document_id`: UUID (FK `documents.id` ON DELETE SET NULL)
- `source_page`: INTEGER
- `source_quote`: TEXT (Mandatory for STRICT mode)
- `difficulty`: TEXT NOT NULL DEFAULT 'medium'
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

### `quiz_attempts`
Records of student quiz sessions.
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `quiz_id`: UUID (FK `quizzes.id` ON DELETE CASCADE)
- `user_id`: UUID (FK `profiles.id` ON DELETE CASCADE)
- `is_retry`: BOOLEAN NOT NULL DEFAULT FALSE
- `parent_attempt_id`: UUID (FK `quiz_attempts.id` ON DELETE SET NULL)
- `score`: NUMERIC(5, 2) NOT NULL DEFAULT 0
- `total_questions`: INTEGER NOT NULL
- `correct_count`: INTEGER NOT NULL DEFAULT 0
- `time_taken_seconds`: INTEGER NOT NULL DEFAULT 0
- `started_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `completed_at`: TIMESTAMPTZ

### `question_responses`
Granular per-question responses. This schema provides the foundation for future Spaced Repetition and Bayesian Knowledge Tracing.
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `attempt_id`: UUID (FK `quiz_attempts.id` ON DELETE CASCADE)
- `question_id`: UUID (FK `questions.id` ON DELETE CASCADE)
- `user_id`: UUID (FK `profiles.id` ON DELETE CASCADE)
- `selected_options`: JSONB NOT NULL
- `is_correct`: BOOLEAN NOT NULL
- `time_spent_seconds`: INTEGER NOT NULL DEFAULT 0
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
