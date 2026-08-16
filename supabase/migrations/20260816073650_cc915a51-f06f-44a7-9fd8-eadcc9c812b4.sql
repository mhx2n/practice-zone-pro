CREATE TABLE public.question_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id text NOT NULL,
  exam_id text,
  exam_title text NOT NULL DEFAULT '',
  exam_kind text NOT NULL DEFAULT 'practice',
  question_number integer,
  total_questions integer,
  question_text text NOT NULL DEFAULT '',
  section text,
  reason text NOT NULL DEFAULT 'other',
  message text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit question reports"
  ON public.question_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own question reports"
  ON public.question_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update question reports"
  ON public.question_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete question reports"
  ON public.question_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER question_reports_updated_at
  BEFORE UPDATE ON public.question_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX question_reports_status_idx ON public.question_reports (status, created_at DESC);