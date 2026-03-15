
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Create users table (profiles)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  role app_role NOT NULL DEFAULT 'user',
  birthday DATE,
  pin TEXT,
  notes TEXT,
  barcode TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES public.users(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  details TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(_auth_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_id = _auth_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super(_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = _auth_id AND role IN ('admin', 'super_admin')
  );
$$;

-- Users policies - admins and super_admins can do everything
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Super admins can insert users" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Super admins can update users" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Super admins can delete users" ON public.users
  FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Attendance policies
CREATE POLICY "Admins can view attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can insert attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Events policies
CREATE POLICY "Admins can view events" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
