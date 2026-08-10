CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  exam_id text NOT NULL,
  exam_title text NOT NULL DEFAULT '',
  total_questions integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  wrong integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  negative_marks numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX results_session_idx ON public.results(session_id);
GRANT SELECT, INSERT ON public.results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results readable" ON public.results FOR SELECT USING (true);
CREATE POLICY "anyone can save results" ON public.results FOR INSERT WITH CHECK (true);
CREATE POLICY "admins manage results" ON public.results FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.wrong_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  exam_id text NOT NULL,
  exam_title text NOT NULL DEFAULT '',
  question_id text NOT NULL,
  question_text text NOT NULL DEFAULT '',
  question_image text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  option_images jsonb,
  correct_answer text NOT NULL DEFAULT '',
  user_answer text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wrong_answers_session_idx ON public.wrong_answers(session_id);
GRANT SELECT, INSERT, DELETE ON public.wrong_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wrong_answers TO authenticated;
GRANT ALL ON public.wrong_answers TO service_role;
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wrong answers readable" ON public.wrong_answers FOR SELECT USING (true);
CREATE POLICY "anyone can save wrong answers" ON public.wrong_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can delete wrong answers" ON public.wrong_answers FOR DELETE USING (true);

CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  page_path text NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_visits_created_idx ON public.page_visits(created_at DESC);
GRANT SELECT, INSERT ON public.page_visits TO anon;
GRANT SELECT, INSERT ON public.page_visits TO authenticated;
GRANT ALL ON public.page_visits TO service_role;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visits readable" ON public.page_visits FOR SELECT USING (true);
CREATE POLICY "anyone can track visit" ON public.page_visits FOR INSERT WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_visits;