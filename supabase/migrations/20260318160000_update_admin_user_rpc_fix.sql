-- Fix RPC overload mapping for update_admin_user by accepting TEXT for new_role instead of app_role

DROP FUNCTION IF EXISTS public.update_admin_user(UUID, TEXT, TEXT, TEXT, app_role);

CREATE OR REPLACE FUNCTION public.update_admin_user(
  target_auth_id UUID,
  new_email TEXT,
  new_password TEXT DEFAULT NULL,
  new_name TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  caller_role app_role;
  parsed_role app_role;
BEGIN
  -- 1. Verify caller is a super admin
  SELECT public.get_user_role(auth.uid()) INTO caller_role;
  IF caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can update administrators';
  END IF;

  -- Cast the text role to the enum
  IF new_role IS NOT NULL THEN
    parsed_role := new_role::app_role;
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
    role = COALESCE(parsed_role, role)
  WHERE auth_id = target_auth_id;
END;
$$;
