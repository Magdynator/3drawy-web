-- Migration to fix missing column in activity_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='activity_logs' AND column_name='target_id'
    ) THEN
        ALTER TABLE public.activity_logs ADD COLUMN target_id UUID;
    END IF;
END $$;

-- Also ensure the table exists just in case
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    performed_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    target_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
