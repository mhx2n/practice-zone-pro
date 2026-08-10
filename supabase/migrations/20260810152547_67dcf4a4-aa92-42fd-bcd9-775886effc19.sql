CREATE TABLE public.live_exam_premium_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_exam_id uuid NOT NULL REFERENCES public.live_exams(id) ON DELETE CASCADE,
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_exam_id, premium_batch_id)
);

GRANT SELECT ON public.live_exam_premium_batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_exam_premium_batches TO authenticated;
GRANT ALL ON public.live_exam_premium_batches TO service_role;

ALTER TABLE public.live_exam_premium_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live exam batch links readable"
  ON public.live_exam_premium_batches FOR SELECT USING (true);

CREATE POLICY "admins manage live exam batch links"
  ON public.live_exam_premium_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.can_view_live_exam(_live_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.live_exam_premium_batches WHERE live_exam_id = _live_exam_id)
     OR EXISTS (
          SELECT 1 FROM public.live_exam_premium_batches lpb
          JOIN public.premium_batch_members m
            ON m.premium_batch_id = lpb.premium_batch_id AND m.user_id = auth.uid()
          WHERE lpb.live_exam_id = _live_exam_id)
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_live_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_live_exam(uuid) TO authenticated;

DROP POLICY IF EXISTS "live exams readable" ON public.live_exams;
CREATE POLICY "live exams readable"
  ON public.live_exams FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.can_view_live_exam(id));
