-- Re-add the foreign key on activity_logs pointing to the CORRECT table (admins)
ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_performed_by_fkey
FOREIGN KEY (performed_by)
REFERENCES public.admins(id)
ON DELETE SET NULL;
