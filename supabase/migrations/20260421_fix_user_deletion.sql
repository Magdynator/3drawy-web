
-- RPC to safely delete a user and their auth account
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    target_auth_id UUID;
    target_role app_role;
    caller_role app_role;
BEGIN
    -- 1. Check if caller is admin or super admin
    SELECT public.get_user_role(auth.uid()) INTO caller_role;
    IF caller_role IS NULL OR caller_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;

    -- 2. Prevent deleting one's self
    IF target_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()) THEN
        RAISE EXCEPTION 'You cannot delete your own account';
    END IF;

    -- 3. Check target role and auth_id
    SELECT role, auth_id INTO target_role, target_auth_id FROM public.users WHERE id = target_user_id;

    -- 4. Safety: Only super admins can delete other admins or super admins
    IF target_role IN ('admin', 'super_admin') AND caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can delete other administrators';
    END IF;

    -- 5. Delete from auth.users if linked (this will cascade to public.users via auth_id FK)
    IF target_auth_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = target_auth_id;
    END IF;

    -- 6. Ensure the record is deleted from public.users (in case it didn't have an auth_id or cascade didn't catch it)
    DELETE FROM public.users WHERE id = target_user_id;

    -- 7. Log the activity
    INSERT INTO public.activity_logs (performed_by, action, details, target_id)
    SELECT id, 'DELETE_USER', 'Deleted user with ID: ' || target_user_id, target_user_id
    FROM public.admins
    WHERE auth_id = auth.uid()
    LIMIT 1;
END;
$$;

-- Update RLS policies to formally allow admins delete access (though RPC bypasses it)
DROP POLICY IF EXISTS "Super admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Explicitly grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
