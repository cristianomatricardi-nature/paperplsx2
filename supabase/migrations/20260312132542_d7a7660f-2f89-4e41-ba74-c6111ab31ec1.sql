
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_personas jsonb NOT NULL DEFAULT '["phd_postdoc","pi_tenure","think_tank","science_educator","ai_agent","funder_private"]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (default_personas) VALUES ('["phd_postdoc","pi_tenure","think_tank","science_educator","ai_agent","funder_private"]'::jsonb);
