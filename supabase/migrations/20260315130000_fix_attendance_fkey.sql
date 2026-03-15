-- Fix the scanned_by foreign key to point to the correct table (admins instead of users)
ALTER TABLE public.attendance
DROP CONSTRAINT IF EXISTS attendance_scanned_by_fkey;

ALTER TABLE public.attendance
ADD CONSTRAINT attendance_scanned_by_fkey
FOREIGN KEY (scanned_by)
REFERENCES public.admins(id)
ON DELETE SET NULL;
