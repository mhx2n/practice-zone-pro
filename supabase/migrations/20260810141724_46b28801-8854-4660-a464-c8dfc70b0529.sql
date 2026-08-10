-- 1. Subject enrichment
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2. Papers inside a subject
CREATE TABLE IF NOT EXISTS public.subject_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subject_papers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subject_papers TO authenticated;
GRANT ALL ON public.subject_papers TO service_role;
ALTER TABLE public.subject_papers ENABLE ROW LEVEL SECURITY;

-- 3. Chapters inside a paper
CREATE TABLE IF NOT EXISTS public.paper_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.subject_papers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.paper_chapters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.paper_chapters TO authenticated;
GRANT ALL ON public.paper_chapters TO service_role;
ALTER TABLE public.paper_chapters ENABLE ROW LEVEL SECURITY;

-- 4. Exams can belong to a chapter
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.paper_chapters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS exams_chapter_id_idx ON public.exams(chapter_id);
CREATE INDEX IF NOT EXISTS subject_papers_subject_idx ON public.subject_papers(subject_id);
CREATE INDEX IF NOT EXISTS paper_chapters_paper_idx ON public.paper_chapters(paper_id);

-- 5. Premium links for subjects and sections
CREATE TABLE IF NOT EXISTS public.subject_premium_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, premium_batch_id)
);
GRANT SELECT ON public.subject_premium_batches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subject_premium_batches TO authenticated;
GRANT ALL ON public.subject_premium_batches TO service_role;
ALTER TABLE public.subject_premium_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.section_premium_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, premium_batch_id)
);
GRANT SELECT ON public.section_premium_batches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.section_premium_batches TO authenticated;
GRANT ALL ON public.section_premium_batches TO service_role;
ALTER TABLE public.section_premium_batches ENABLE ROW LEVEL SECURITY;

-- 6. Access helper functions
CREATE OR REPLACE FUNCTION public.can_view_section(_section_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _section_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.section_premium_batches WHERE section_id = _section_id)
     OR EXISTS (
          SELECT 1 FROM public.section_premium_batches spb
          JOIN public.premium_batch_members m
            ON m.premium_batch_id = spb.premium_batch_id AND m.user_id = auth.uid()
          WHERE spb.section_id = _section_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_subject(_subject_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _subject_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.subject_premium_batches WHERE subject_id = _subject_id)
     OR EXISTS (
          SELECT 1 FROM public.subject_premium_batches spb
          JOIN public.premium_batch_members m
            ON m.premium_batch_id = spb.premium_batch_id AND m.user_id = auth.uid()
          WHERE spb.subject_id = _subject_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_exam(_exam_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR (
      (
        NOT EXISTS (SELECT 1 FROM public.exam_premium_batches WHERE exam_id = _exam_id)
        OR EXISTS (
             SELECT 1 FROM public.exam_premium_batches epb
             JOIN public.premium_batch_members m
               ON m.premium_batch_id = epb.premium_batch_id AND m.user_id = auth.uid()
             WHERE epb.exam_id = _exam_id)
      )
      AND public.can_view_section((SELECT section_id FROM public.exams WHERE id = _exam_id))
      AND COALESCE((
            SELECT bool_and(public.can_view_subject(s.id))
            FROM public.subjects s
            WHERE s.name = (SELECT e.subject FROM public.exams e WHERE e.id = _exam_id)
          ), true)
      AND COALESCE((
            SELECT public.can_view_subject(sp.subject_id)
            FROM public.exams e
            JOIN public.paper_chapters pc ON pc.id = e.chapter_id
            JOIN public.subject_papers sp ON sp.id = pc.paper_id
            WHERE e.id = _exam_id
          ), true)
    )
$$;

-- 7. Policies for new tables
DROP POLICY IF EXISTS "papers readable" ON public.subject_papers;
CREATE POLICY "papers readable" ON public.subject_papers FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.can_view_subject(subject_id));
DROP POLICY IF EXISTS "admins manage papers" ON public.subject_papers;
CREATE POLICY "admins manage papers" ON public.subject_papers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "chapters readable" ON public.paper_chapters;
CREATE POLICY "chapters readable" ON public.paper_chapters FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.can_view_subject((SELECT sp.subject_id FROM public.subject_papers sp WHERE sp.id = paper_id)));
DROP POLICY IF EXISTS "admins manage chapters" ON public.paper_chapters;
CREATE POLICY "admins manage chapters" ON public.paper_chapters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "subject premium links readable" ON public.subject_premium_batches;
CREATE POLICY "subject premium links readable" ON public.subject_premium_batches FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins manage subject premium links" ON public.subject_premium_batches;
CREATE POLICY "admins manage subject premium links" ON public.subject_premium_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "section premium links readable" ON public.section_premium_batches;
CREATE POLICY "section premium links readable" ON public.section_premium_batches FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins manage section premium links" ON public.section_premium_batches;
CREATE POLICY "admins manage section premium links" ON public.section_premium_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 8. Tighten read policies on existing content tables
DROP POLICY IF EXISTS "sections readable" ON public.sections;
DROP POLICY IF EXISTS "Sections are viewable by everyone" ON public.sections;
CREATE POLICY "sections readable" ON public.sections FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.can_view_section(id));

DROP POLICY IF EXISTS "subjects readable" ON public.subjects;
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
CREATE POLICY "subjects readable" ON public.subjects FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.can_view_subject(id));

DROP POLICY IF EXISTS "exams readable" ON public.exams;
DROP POLICY IF EXISTS "Published exams are viewable by everyone" ON public.exams;
CREATE POLICY "exams readable" ON public.exams FOR SELECT
  USING (public.can_view_exam(id));

DROP POLICY IF EXISTS "questions readable" ON public.questions;
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
CREATE POLICY "questions readable" ON public.questions FOR SELECT
  USING (public.can_view_exam(exam_id));

-- 9. Hide premium link rows for exams from non-admins too
DROP POLICY IF EXISTS "exam premium links readable" ON public.exam_premium_batches;
CREATE POLICY "exam premium links readable" ON public.exam_premium_batches FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));