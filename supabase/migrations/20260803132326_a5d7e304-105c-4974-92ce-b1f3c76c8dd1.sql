-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BATCHES ============
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches readable" ON public.batches FOR SELECT USING (true);
CREATE POLICY "admins manage batches" ON public.batches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROFILES ============
CREATE SEQUENCE public.profile_unique_number_seq START 1001;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  batch_name text,
  unique_number bigint NOT NULL DEFAULT nextval('public.profile_unique_number_seq'),
  unique_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable to signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.profile_unique_number_seq');
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, unique_number, unique_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    n,
    'TG-' || n::text
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.assign_batch_to_profile(_user_id uuid, _batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.profiles p
  SET batch_id = _batch_id,
      batch_name = (SELECT b.name FROM public.batches b WHERE b.id = _batch_id)
  WHERE p.user_id = _user_id;
END; $$;

-- ============ PREMIUM BATCHES ============
CREATE TABLE public.premium_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_batches TO authenticated;
GRANT ALL ON public.premium_batches TO service_role;
ALTER TABLE public.premium_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "premium batches readable" ON public.premium_batches FOR SELECT USING (true);
CREATE POLICY "admins manage premium batches" ON public.premium_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.premium_batch_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_batch_id uuid NOT NULL REFERENCES public.premium_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (premium_batch_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_batch_members TO authenticated;
GRANT ALL ON public.premium_batch_members TO service_role;
ALTER TABLE public.premium_batch_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members readable" ON public.premium_batch_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage members" ON public.premium_batch_members FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SECTIONS / SUBJECTS / CATEGORIES ============
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image text,
  caption text,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections readable" ON public.sections FOR SELECT USING (true);
CREATE POLICY "admins manage sections" ON public.sections FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects readable" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ EXAMS / QUESTIONS ============
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

-- ============ NOTICES / REMINDERS / BANNERS / SETTINGS ============
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  image text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notices readable" ON public.notices FOR SELECT USING (true);
CREATE POLICY "admins manage notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_date timestamptz NOT NULL DEFAULT now(),
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reminders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders readable" ON public.reminders FOR SELECT USING (true);
CREATE POLICY "admins manage reminders" ON public.reminders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.event_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  target_date timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_banners TO authenticated;
GRANT ALL ON public.event_banners TO service_role;
ALTER TABLE public.event_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners readable" ON public.event_banners FOR SELECT USING (true);
CREATE POLICY "admins manage banners" ON public.event_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  about_title text NOT NULL DEFAULT '',
  about_content text NOT NULL DEFAULT '',
  features_title text NOT NULL DEFAULT '',
  features_content text NOT NULL DEFAULT '',
  contact_title text NOT NULL DEFAULT '',
  contact_content text NOT NULL DEFAULT '',
  footer_description text NOT NULL DEFAULT '',
  footer_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  brand_name text NOT NULL DEFAULT 'Target',
  brand_emoji text NOT NULL DEFAULT '🎯',
  hero_tagline text NOT NULL DEFAULT '',
  hero_subtitle text NOT NULL DEFAULT '',
  active_theme_id text NOT NULL DEFAULT 'ocean-blue',
  custom_theme jsonb,
  ui_labels jsonb,
  report_settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ RESULTS / WRONG ANSWERS / VISITS (session based) ============
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

-- ============ EXAM ATTEMPTS (signed in) ============
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

-- ============ LIVE EXAMS ============
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