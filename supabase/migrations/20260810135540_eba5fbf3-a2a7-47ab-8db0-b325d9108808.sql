CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  question_count integer NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 30,
  negative_marking numeric NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  mandatory_subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams readable" ON public.exams FOR SELECT USING (true);
CREATE POLICY "admins manage exams" ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_image text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  option_images jsonb,
  answer text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'mcq',
  section text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_exam_id_idx ON public.questions(exam_id);
GRANT SELECT ON public.questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable" ON public.questions FOR SELECT USING (true);
CREATE POLICY "admins manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.exam_premium_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, premium_batch_id)
);
GRANT SELECT ON public.exam_premium_batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_premium_batches TO authenticated;
GRANT ALL ON public.exam_premium_batches TO service_role;
ALTER TABLE public.exam_premium_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam premium links readable" ON public.exam_premium_batches FOR SELECT USING (true);
CREATE POLICY "admins manage exam premium links" ON public.exam_premium_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));