CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  wrong_answers integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.exam_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own attempts" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  selected_answer text NOT NULL DEFAULT '',
  correct_answer text NOT NULL DEFAULT '',
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_answers TO authenticated;
GRANT ALL ON public.exam_answers TO service_role;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam answers" ON public.exam_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "insert own exam answers" ON public.exam_answers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));

CREATE TABLE public.live_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  access_mode text NOT NULL DEFAULT 'open',
  status text NOT NULL DEFAULT 'scheduled',
  show_leaderboard boolean NOT NULL DEFAULT true,
  negative_marking numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_exams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_exams TO authenticated;
GRANT ALL ON public.live_exams TO service_role;
ALTER TABLE public.live_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live exams readable" ON public.live_exams FOR SELECT USING (true);
CREATE POLICY "signed in can sync live status" ON public.live_exams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins manage live exams" ON public.live_exams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.live_exam_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_exam_id uuid NOT NULL REFERENCES public.live_exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered',
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  wrong integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  negative_marks numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  time_taken_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_exam_id, user_id)
);
GRANT SELECT ON public.live_exam_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_exam_participants TO authenticated;
GRANT ALL ON public.live_exam_participants TO service_role;
ALTER TABLE public.live_exam_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants readable" ON public.live_exam_participants FOR SELECT USING (true);
CREATE POLICY "join live exam" ON public.live_exam_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own participation" ON public.live_exam_participants FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete participation" ON public.live_exam_participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.live_exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.live_exam_participants(id) ON DELETE CASCADE,
  live_exam_id uuid NOT NULL REFERENCES public.live_exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  selected_answer text NOT NULL DEFAULT '',
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_exam_answers_participant_idx ON public.live_exam_answers(participant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_exam_answers TO authenticated;
GRANT ALL ON public.live_exam_answers TO service_role;
ALTER TABLE public.live_exam_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own live answers" ON public.live_exam_answers FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own live answers" ON public.live_exam_answers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own live answers" ON public.live_exam_answers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_exam_participants;