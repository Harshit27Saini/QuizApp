-- ============================================================
-- Recall — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- Users
-- ============================================================
create table if not exists public.users (
  id            text primary key,
  email         text unique not null,
  password_hash text,
  salt          text,
  display_name  text,
  xp            integer default 0,
  streak        integer default 0,
  cheerleader   text default 'sydney',
  created_at    timestamptz default now()
);
alter table public.users enable row level security;
-- Service-role key bypasses RLS; anon key needs policies
create policy "service_role_all" on public.users using (true) with check (true);

-- ============================================================
-- Collections
-- ============================================================
create table if not exists public.collections (
  id          text primary key,
  user_id     text not null,
  title       text not null,
  description text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.collections enable row level security;
create policy "service_role_all" on public.collections using (true) with check (true);
create index if not exists idx_collections_user_id on public.collections(user_id);

-- ============================================================
-- Documents
-- ============================================================
create table if not exists public.documents (
  id              text primary key,
  collection_id   text not null references public.collections(id) on delete cascade,
  user_id         text not null,
  filename        text not null,
  file_type       text not null,
  file_size_bytes integer default 0,
  storage_path    text,
  total_pages     integer default 1,
  status          text default 'ready',
  error_message   text,
  created_at      timestamptz default now()
);
alter table public.documents enable row level security;
create policy "service_role_all" on public.documents using (true) with check (true);
create index if not exists idx_documents_collection_id on public.documents(collection_id);
create index if not exists idx_documents_user_id on public.documents(user_id);

-- ============================================================
-- Document Sections
-- ============================================================
create table if not exists public.document_sections (
  id              text primary key,
  document_id     text not null references public.documents(id) on delete cascade,
  section_index   integer not null,
  page_number     integer,
  heading         text default '',
  content         text not null,
  token_estimate  integer default 0,
  created_at      timestamptz default now()
);
alter table public.document_sections enable row level security;
create policy "service_role_all" on public.document_sections using (true) with check (true);
create index if not exists idx_sections_document_id on public.document_sections(document_id);

-- ============================================================
-- Quizzes
-- ============================================================
create table if not exists public.quizzes (
  id            text primary key,
  user_id       text not null,
  collection_id text,
  title         text not null,
  mode          text default 'practice',
  difficulty    text default 'medium',
  document_ids  jsonb default '[]',
  created_at    timestamptz default now()
);
alter table public.quizzes enable row level security;
create policy "service_role_all" on public.quizzes using (true) with check (true);
create index if not exists idx_quizzes_user_id on public.quizzes(user_id);

-- ============================================================
-- Questions
-- ============================================================
create table if not exists public.questions (
  id                 text primary key,
  quiz_id            text not null references public.quizzes(id) on delete cascade,
  question_type      text default 'MCQ',
  prompt             text not null,
  options            jsonb default '[]',
  correct_answers    jsonb default '[]',
  explanation        text,
  source_document_id text,
  source_page        integer,
  source_quote       text,
  difficulty         text default 'medium',
  created_at         timestamptz default now()
);
alter table public.questions enable row level security;
create policy "service_role_all" on public.questions using (true) with check (true);
create index if not exists idx_questions_quiz_id on public.questions(quiz_id);

-- ============================================================
-- Quiz Attempts
-- ============================================================
create table if not exists public.quiz_attempts (
  id                 text primary key,
  quiz_id            text not null references public.quizzes(id) on delete cascade,
  user_id            text not null,
  is_retry           boolean default false,
  parent_attempt_id  text,
  score              float default 0,
  total_questions    integer default 0,
  correct_count      integer default 0,
  time_taken_seconds integer default 0,
  started_at         timestamptz default now(),
  completed_at       timestamptz
);
alter table public.quiz_attempts enable row level security;
create policy "service_role_all" on public.quiz_attempts using (true) with check (true);
create index if not exists idx_attempts_user_id on public.quiz_attempts(user_id);
create index if not exists idx_attempts_quiz_id on public.quiz_attempts(quiz_id);

-- ============================================================
-- Question Responses
-- ============================================================
create table if not exists public.question_responses (
  id                 text primary key,
  attempt_id         text not null references public.quiz_attempts(id) on delete cascade,
  question_id        text not null,
  user_id            text not null,
  selected_options   jsonb default '[]',
  is_correct         boolean default false,
  time_spent_seconds integer default 0,
  created_at         timestamptz default now()
);
alter table public.question_responses enable row level security;
create policy "service_role_all" on public.question_responses using (true) with check (true);
create index if not exists idx_responses_attempt_id on public.question_responses(attempt_id);

-- ============================================================
-- Flashcard Decks
-- ============================================================
create table if not exists public.flashcard_decks (
  id            text primary key,
  user_id       text not null,
  collection_id text not null,
  title         text not null,
  document_ids  jsonb default '[]',
  created_at    timestamptz default now()
);
alter table public.flashcard_decks enable row level security;
create policy "service_role_all" on public.flashcard_decks using (true) with check (true);

-- ============================================================
-- Flashcards
-- ============================================================
create table if not exists public.flashcards (
  id           text primary key,
  deck_id      text not null references public.flashcard_decks(id) on delete cascade,
  front        text not null,
  back         text not null,
  source_page  integer,
  source_quote text,
  tags         jsonb default '[]',
  mastered     boolean default false,
  created_at   timestamptz default now()
);
alter table public.flashcard_decks enable row level security;
create policy "service_role_all" on public.flashcards using (true) with check (true);
create index if not exists idx_flashcards_deck_id on public.flashcards(deck_id);

-- ============================================================
-- Learning Paths
-- ============================================================
create table if not exists public.learning_paths (
  id              text primary key,
  user_id         text not null,
  collection_id   text,
  document_id     text not null,
  title           text not null,
  total_units     integer default 0,
  completed_units integer default 0,
  created_at      timestamptz default now()
);
alter table public.learning_paths enable row level security;
create policy "service_role_all" on public.learning_paths using (true) with check (true);
create index if not exists idx_paths_user_id on public.learning_paths(user_id);
create index if not exists idx_paths_document_id on public.learning_paths(document_id);

-- ============================================================
-- Path Nodes (Dungeon Map Nodes)
-- ============================================================
create table if not exists public.path_nodes (
  id                    text primary key,
  path_id               text not null references public.learning_paths(id) on delete cascade,
  unit_index            integer not null,
  node_type             text default 'lesson',
  trail_type            text default 'main',         -- main | deep_dive | trap_vault | secret_vault | gauntlet | boss
  branch_direction      text,                        -- left | right | null
  branch_depth          integer default 0,
  branch_from_unit_index integer,
  title                 text not null,
  concept_summary       text default '',
  key_takeaways         jsonb default '[]',
  substantive_content   jsonb,
  source_page           integer,
  slide_start           integer,
  slide_end             integer,
  is_challenge_trail    boolean default false,
  difficulty            text default 'medium',
  questions             jsonb default '[]',
  is_completed          boolean default false,
  is_locked             boolean default true,
  score                 float,
  xp_reward             integer default 25,
  created_at            timestamptz default now()
);
alter table public.path_nodes enable row level security;
create policy "service_role_all" on public.path_nodes using (true) with check (true);
create index if not exists idx_nodes_path_id on public.path_nodes(path_id);
create index if not exists idx_nodes_trail_type on public.path_nodes(trail_type);

-- ============================================================
-- Feedback
-- ============================================================
create table if not exists public.feedback (
  id           text primary key,
  user_id      text,
  email        text,
  display_name text,
  type         text,
  message      text not null,
  url          text,
  browser_info text,
  status       text default 'open',
  created_at   timestamptz default now()
);
alter table public.feedback enable row level security;
create policy "service_role_all" on public.feedback using (true) with check (true);

-- ============================================================
-- Telemetry Logs
-- ============================================================
create table if not exists public.telemetry_logs (
  id          text primary key,
  user_id     text,
  user_email  text,
  user_name   text,
  event_type  text,
  path        text,
  payload     jsonb default '{}',
  device_info jsonb default '{}',
  created_at  timestamptz default now()
);
alter table public.telemetry_logs enable row level security;
create policy "service_role_all" on public.telemetry_logs using (true) with check (true);
create index if not exists idx_telemetry_user_id on public.telemetry_logs(user_id);
create index if not exists idx_telemetry_created_at on public.telemetry_logs(created_at desc);

-- ============================================================
-- Friend Requests
-- ============================================================
create table if not exists public.friend_requests (
  id            text primary key,
  from_user_id  text not null,
  from_email    text not null,
  from_name     text,
  to_email      text not null,
  status        text default 'pending',
  created_at    timestamptz default now()
);
alter table public.friend_requests enable row level security;
create policy "service_role_all" on public.friend_requests using (true) with check (true);
create index if not exists idx_friend_requests_to_email on public.friend_requests(to_email);

-- ============================================================
-- Friendships
-- ============================================================
create table if not exists public.friendships (
  id          text primary key,
  user1_id    text,
  user1_email text,
  user1_name  text,
  user2_id    text,
  user2_email text,
  created_at  timestamptz default now()
);
alter table public.friendships enable row level security;
create policy "service_role_all" on public.friendships using (true) with check (true);

