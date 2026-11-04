-- ==============================================================================
-- RECALL LEARNING PLATFORM - INITIAL SCHEMA MIGRATION
-- Migration: 20261104000000_init_schema.sql
-- Description: Core tables, indexes, and Row Level Security policies
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatic profile creation on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. COLLECTIONS (Study workspaces / subjects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. DOCUMENTS (Uploaded study documents)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'pptx', 'txt')),
    file_size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    total_pages INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. DOCUMENT SECTIONS (Parsed text sections, headings, and page boundaries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    section_index INTEGER NOT NULL,
    page_number INTEGER,
    heading TEXT,
    content TEXT NOT NULL,
    token_estimate INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. QUIZZES (Quiz definitions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'STRICT' CHECK (mode IN ('STRICT', 'CONCEPTUAL')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Join table: Quizzes to Documents (supports multi-document generation)
CREATE TABLE IF NOT EXISTS public.quiz_documents (
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    PRIMARY KEY (quiz_id, document_id)
);

-- ------------------------------------------------------------------------------
-- 6. QUESTIONS (Questions generated for each quiz)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'MSQ')),
    prompt TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answers JSONB NOT NULL,
    explanation TEXT NOT NULL,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    source_page INTEGER,
    source_quote TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. QUIZ ATTEMPTS (User attempts & test runs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_retry BOOLEAN NOT NULL DEFAULT FALSE,
    parent_attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 8. QUESTION RESPONSES (Per-question answers for mastery & spaced repetition)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selected_options JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_collections_user ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_collection ON public.documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_document ON public.document_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_responses_attempt ON public.question_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_question ON public.question_responses(user_id, question_id);

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can select and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Collections: users can CRUD their own collections
CREATE POLICY "Users can view own collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own collections" ON public.collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own collections" ON public.collections FOR DELETE USING (auth.uid() = user_id);

-- Documents: users can CRUD their own documents
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Document Sections: access through document ownership
CREATE POLICY "Users can view own document sections" ON public.document_sections FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_sections.document_id AND documents.user_id = auth.uid()));
CREATE POLICY "Users can insert own document sections" ON public.document_sections FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_sections.document_id AND documents.user_id = auth.uid()));
CREATE POLICY "Users can delete own document sections" ON public.document_sections FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_sections.document_id AND documents.user_id = auth.uid()));

-- Quizzes: users can CRUD their own quizzes
CREATE POLICY "Users can view own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- Questions: access through quiz ownership
CREATE POLICY "Users can view own quiz questions" ON public.questions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can insert own quiz questions" ON public.questions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));

-- Quiz Attempts: users can CRUD their own attempts
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Question Responses: users can CRUD their own question responses
CREATE POLICY "Users can view own responses" ON public.question_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses" ON public.question_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
