-- Add INSERT policy for activity_logs to allow admins to log their actions from the frontend

CREATE POLICY "Admins can insert activity logs" ON public.activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
