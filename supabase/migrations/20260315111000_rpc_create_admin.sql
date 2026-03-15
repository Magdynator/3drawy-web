-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create a securely definer function to allow super admins to create new admins
CREATE OR REPLACE FUNCTION public.create_new_admin(
  new_email TEXT,
  new_password TEXT,
  new_name TEXT,
  new_role app_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as the database owner
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_auth_id UUID;
  caller_role app_role;
BEGIN
  -- 1. Verify caller is a super admin
  SELECT public.get_user_role(auth.uid()) INTO caller_role;
  IF caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can create new administrators';
  END IF;

  -- 2. Insert the user into auth.users using pgcrypto for password hashing
  -- Explicitly cast 'bf' to text to avoid "function gen_salt(unknown) does not exist"
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', new_email, extensions.crypt(new_password, extensions.gen_salt('bf'::text)), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', ''
  ) RETURNING id INTO new_auth_id;

  -- 3. Insert into public.admins table
  INSERT INTO public.admins (auth_id, name, email, role)
  VALUES (new_auth_id, new_name, new_email, new_role);

  RETURN new_auth_id;
END;
$$;
