
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (is_admin_or_super(auth.uid()));
