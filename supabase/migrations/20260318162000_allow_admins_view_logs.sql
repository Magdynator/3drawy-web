-- Update RLS policy for activity_logs to allow both admins and super admins to view logs

-- 1. Drop the existing restricted policy
DROP POLICY IF EXISTS "Super admins can view activity logs" ON public.activity_logs;

-- 2. Create the expanded policy
CREATE POLICY "Admins and super admins can view activity logs" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));
