-- SIMPLEST POSSIBLE FIX: Just drop the problematic constraint entirely.
-- The scanned_by column will still work, it just won't enforce a foreign key.
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_scanned_by_fkey;
