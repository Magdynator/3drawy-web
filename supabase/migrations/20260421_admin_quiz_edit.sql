-- Migration: Allow admins to manage all quizzes and quiz_questions

-- 1. Drop existing restrictive policies on quizzes
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;

-- 2. Recreate policy: owner OR admin can manage quizzes
CREATE POLICY "Owner or admin can manage quizzes" ON public.quizzes
    FOR ALL USING (
        auth.uid() = created_by
        OR public.is_admin_or_super(auth.uid())
    );

-- 3. Drop existing restrictive policy on quiz_questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.quiz_questions;

-- 4. Recreate policy: owner of parent quiz OR admin can manage questions
CREATE POLICY "Owner or admin can manage questions" ON public.quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()
        )
        OR public.is_admin_or_super(auth.uid())
    );
