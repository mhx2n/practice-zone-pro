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