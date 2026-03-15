
CREATE TABLE public.bingo_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  bingo_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start),
  UNIQUE(week_start, bingo_number)
);

ALTER TABLE public.bingo_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bingo numbers"
  ON public.bingo_numbers FOR SELECT
  TO authenticated
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can insert bingo numbers"
  ON public.bingo_numbers FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_super(auth.uid()));

CREATE POLICY "Users can view own bingo number"
  ON public.bingo_numbers FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
