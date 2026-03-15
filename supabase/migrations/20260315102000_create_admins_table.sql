-- Migration to separate admins into their own table

-- 1. Create the new admins table
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP   WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Migrate existing admins from users table if any exist (optional but safe)
-- Assuming auth_id is populated for existing admins
INSERT INTO public.admins (auth_id, name, email, role)
SELECT u.auth_id, u.name, COALESCE(au.email, 'unknown@domain.com'), u.role
FROM public.users u
JOIN auth.users au ON u.auth_id = au.id
WHERE u.role IN ('admin', 'super_admin') AND u.auth_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2.5 Insert a default Super Admin if none exists
DO $$
DECLARE
  new_auth_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE role = 'super_admin') THEN
    -- Insert into auth.users (requires pgcrypto for password hashing, default on Supabase)
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@adrawya.com', crypt('admin123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', ''
    ) RETURNING id INTO new_auth_id;

    -- Insert into public.admins
    INSERT INTO public.admins (auth_id, name, email, role)
    VALUES (new_auth_id, 'Super Admin', 'admin@adrawya.com', 'super_admin');
  END IF;
END $$;

-- 3. Update the security functions to look at the new `admins` table
CREATE OR REPLACE FUNCTION public.get_user_role(_auth_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check admins, fallback to user (or null)
  SELECT role FROM public.admins WHERE auth_id = _auth_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super(_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE auth_id = _auth_id AND role IN ('admin', 'super_admin')
  );
$$;

-- 4. Set RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view admins" ON public.admins
  FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin' OR auth.uid() = auth_id);

CREATE POLICY "Super admins can insert admins" ON public.admins
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update admins" ON public.admins
  FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can delete admins" ON public.admins
  FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin');

-- 5. Add trigger for updated_at
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional but recommended: Drop role column from users later
-- ALTER TABLE public.users DROP COLUMN IF EXISTS role;
