
CREATE OR REPLACE FUNCTION public.increment_points(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.users SET points = points + _amount WHERE id = _user_id;
$$;
