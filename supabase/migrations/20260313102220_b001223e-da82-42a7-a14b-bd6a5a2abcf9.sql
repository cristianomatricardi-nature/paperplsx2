CREATE TABLE public.user_heatmap_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  page_path text NOT NULL,
  x_pct real NOT NULL,
  y_pct real NOT NULL,
  viewport_w integer NOT NULL,
  viewport_h integer NOT NULL,
  dwell_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_heatmap_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own heatmap events"
  ON public.user_heatmap_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all heatmap events"
  ON public.user_heatmap_events FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));