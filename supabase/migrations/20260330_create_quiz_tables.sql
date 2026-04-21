-- Initial migration for Quiz Platform (Kahoot Clone)

-- 1. Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Quiz Questions Table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    image_url TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {text: string, isCorrect: boolean}
    time_limit INTEGER DEFAULT 20 NOT NULL, -- in seconds
    points INTEGER DEFAULT 1000 NOT NULL,
    position INTEGER NOT NULL, -- for ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Quiz Sessions Table (Live Games)
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    pin TEXT UNIQUE NOT NULL, -- 6-digit game PIN
    status TEXT NOT NULL DEFAULT 'lobby', -- 'lobby', 'question', 'leaderboard', 'finished'
    current_question_index INTEGER DEFAULT -1 NOT NULL,
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Quiz Players Table
CREATE TABLE IF NOT EXISTS public.quiz_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    is_host BOOLEAN DEFAULT false NOT NULL,
    last_answer_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, nickname)
);

-- 5. RLS Policies

-- Quizzes: Admins can do everything, public can see (if we want public quizzes)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage quizzes" ON public.quizzes
    FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Anyone can view quizzes" ON public.quizzes
    FOR SELECT USING (true);

-- Quiz Questions: Admins manage, public see
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage questions" ON public.quiz_questions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()
    ));
CREATE POLICY "Anyone can view questions" ON public.quiz_questions
    FOR SELECT USING (true);

-- Quiz Sessions: Host manages, anyone can join/view
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can manage sessions" ON public.quiz_sessions
    FOR ALL USING (auth.uid() = host_id);
CREATE POLICY "Anyone can view sessions" ON public.quiz_sessions
    FOR SELECT USING (true);
CREATE POLICY "Anyone can join sessions" ON public.quiz_sessions
    FOR INSERT WITH CHECK (true); -- Players creating their player record link to session
CREATE POLICY "Anyone can update sessions" ON public.quiz_sessions
    FOR UPDATE USING (true); -- Allow some client-side status updates if needed, though host usually does it

-- Quiz Players: Anyone can join session, host can manage
ALTER TABLE public.quiz_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join as player" ON public.quiz_players
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update their own record" ON public.quiz_players
    FOR UPDATE USING (true); -- Simplified for clone, in production we'd check session/cookie
CREATE POLICY "Anyone can see players" ON public.quiz_players
    FOR SELECT USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
