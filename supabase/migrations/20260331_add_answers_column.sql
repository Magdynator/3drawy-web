-- Add answers JSONB column to quiz_players for tracking per-question answers
ALTER TABLE public.quiz_players
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
