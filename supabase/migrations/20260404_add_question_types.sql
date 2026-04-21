-- Migration: Add question_type and extra_config to quiz_questions
-- Run this in your Supabase SQL Editor

-- Add question_type column (defaults existing questions to 'quiz')
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'quiz';

-- Add extra_config JSONB column for type-specific settings
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS extra_config JSONB DEFAULT '{}'::jsonb;

-- Add DELETE policy on quiz_sessions (allows cleanup after game)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow deleting sessions' AND tablename = 'quiz_sessions'
    ) THEN
        CREATE POLICY "Allow deleting sessions" ON public.quiz_sessions FOR DELETE USING (true);
    END IF;
END
$$;

-- Ensure DELETE policy on quiz_players exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow deleting players' AND tablename = 'quiz_players'
    ) THEN
        CREATE POLICY "Allow deleting players" ON public.quiz_players FOR DELETE USING (true);
    END IF;
END
$$;
