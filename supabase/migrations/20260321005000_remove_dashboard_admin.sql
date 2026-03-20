-- New delete admin RPC with a different name to bypass Supabase schema cache
CREATE OR REPLACE FUNCTION public.remove_dashboard_admin(target_auth_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  caller_role app_role;
BEGIN
  -- 1. Verify caller is a super admin
  SELECT public.get_user_role(auth.uid()) INTO caller_role;
  IF caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can delete administrators';
  END IF;

  -- 2. Prevent a super admin from deleting themselves
  IF target_auth_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  -- 3. Delete from public.admins first
  DELETE FROM public.admins WHERE auth_id = target_auth_id;

  -- 4. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_auth_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.remove_dashboard_admin(UUID) TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
