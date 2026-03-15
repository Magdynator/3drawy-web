-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    performed_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    target_id UUID, -- Optional: ID of the user or entity affected
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Only Super Admins can view logs
CREATE POLICY "Super admins can view activity logs" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (public.get_user_role(auth.uid()) = 'super_admin');

-- 4. Secure function for Super Admins to add points directly
CREATE OR REPLACE FUNCTION public.add_points_super_admin(_user_id uuid, _amount integer, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_id uuid;
BEGIN
    -- 1. Verify caller is super_admin
    IF public.get_user_role(auth.uid()) != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can perform this action';
    END IF;

    -- 2. Get admin record id
    SELECT id INTO admin_id FROM public.admins WHERE auth_id = auth.uid();

    -- 3. Update points
    UPDATE public.users SET points = points + _amount WHERE id = _user_id;

    -- 4. Log the activity
    INSERT INTO public.activity_logs (performed_by, action, details, target_id)
    VALUES (admin_id, 'ADD_POINTS', 'Direct points added: ' || _amount || '. Reason: ' || _reason, _user_id);
END;
$$;
