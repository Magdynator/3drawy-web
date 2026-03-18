-- Create a secure RPC function to record dashboard actions.
-- This prevents RLS issues while stopping clients from spoofing their admin_id.

CREATE OR REPLACE FUNCTION public.log_dashboard_action(_action text, _details text, _target_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _admin_id uuid;
BEGIN
    -- Only allow logged-in admins to perform actions
    SELECT id INTO _admin_id FROM public.admins WHERE auth_id = auth.uid();
    
    IF _admin_id IS NULL THEN
        RAISE EXCEPTION 'Not authorized. Only dashboard admins can log actions.';
    END IF;

    INSERT INTO public.activity_logs (performed_by, action, details, target_id)
    VALUES (_admin_id, _action, _details, _target_id);
END;
$$;
