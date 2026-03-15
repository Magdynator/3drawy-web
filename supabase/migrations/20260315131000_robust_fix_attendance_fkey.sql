-- 1. Drop the old constraint if it exists (pointing to users)
ALTER TABLE public.attendance
DROP CONSTRAINT IF EXISTS attendance_scanned_by_fkey;

-- 2. Data Cleanup:
-- Existing attendance records might have 'scanned_by' IDs that refer to the old 'users' table.
-- Since we moved admins to a new 'admins' table with NEW primary keys, 
-- we must clear these old references so the new constraint can be applied.
UPDATE public.attendance
SET scanned_by = NULL
WHERE scanned_by IS NOT NULL 
AND scanned_by NOT IN (SELECT id FROM public.admins);

-- 3. Add the new constraint (pointing to admins)
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_scanned_by_fkey
FOREIGN KEY (scanned_by)
REFERENCES public.admins(id)
ON DELETE SET NULL;

-- 4. Double check RLS - ensure admins can still insert
-- (Redundant if already set, but good for troubleshooting)
DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
CREATE POLICY "Admins can insert attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));
