-- RPC for deleting an admin account safely
CREATE OR REPLACE FUNCTION public.delete_admin_user(target_auth_id UUID)
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

  -- 2. Prevent a super admin from deleting themselves (safety)
  IF target_auth_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  -- 3. Delete from public.admins first (due to foreign key or logical link)
  DELETE FROM public.admins WHERE auth_id = target_auth_id;

  -- 4. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_auth_id;
END;
$$;

-- RPC for updating admin credentials (email, password, etc.)
CREATE OR REPLACE FUNCTION public.update_admin_user(
  target_auth_id UUID,
  new_email TEXT,
  new_password TEXT DEFAULT NULL, -- NULL means don't change password
  new_name TEXT DEFAULT NULL,
  new_role app_role DEFAULT NULL
)
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
    RAISE EXCEPTION 'Only super admins can update administrators';
  END IF;

  -- 2. Update auth.users email and optionally password
  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users
    SET 
      email = new_email,
      encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'::text)),
      updated_at = now()
    WHERE id = target_auth_id;
  ELSE
    UPDATE auth.users
    SET 
      email = new_email,
      updated_at = now()
    WHERE id = target_auth_id;
  END IF;

  -- 3. Update public.admins
  UPDATE public.admins
  SET 
    name = COALESCE(new_name, name),
    email = new_email,
    role = COALESCE(new_role, role)
  WHERE auth_id = target_auth_id;
END;
$$;
