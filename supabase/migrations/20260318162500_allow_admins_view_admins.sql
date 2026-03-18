-- Update public.admins RLS to allow all admins to see all other admins
-- This is necessary so they can resolve names of other admins in activity logs and attendance

-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Super admins can view admins" ON public.admins;

-- 2. Create the expanded policy
CREATE POLICY "Admins can view admins" ON public.admins
  FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin'));
