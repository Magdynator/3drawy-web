-- 1. Drop existing overloaded functions to resolve ambiguity
DROP FUNCTION IF EXISTS public.add_points_super_admin(uuid, integer, text);
DROP FUNCTION IF EXISTS public.add_points_super_admin(uuid, numeric, text);

-- 2. Create a single, definitive version using numeric for better JS compatibility
CREATE OR REPLACE FUNCTION public.add_points_super_admin(_user_id uuid, _amount numeric, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_id uuid;
    int_amount integer;
BEGIN
    -- 1. Convert numeric amount to integer for the points update
    int_amount := _amount::integer;

    -- 2. Verify caller is super_admin
    IF public.get_user_role(auth.uid()) != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can perform this action';
    END IF;

    -- 3. Get admin record id from the admins table
    SELECT id INTO admin_id FROM public.admins WHERE auth_id = auth.uid();

    -- 4. Update points in the users table
    UPDATE public.users SET points = points + int_amount WHERE id = _user_id;

    -- 5. Log the activity in the activity_logs table
    INSERT INTO public.activity_logs (performed_by, action, details, target_id)
    VALUES (admin_id, 'ADD_POINTS', 'Direct points added: ' || int_amount || '. Reason: ' || _reason, _user_id);
END;
$$;

-- 3. Grant explicit execute permissions
GRANT EXECUTE ON FUNCTION public.add_points_super_admin(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_points_super_admin(uuid, numeric, text) TO service_role;
