
-- Migration A: Activity events table
CREATE TABLE public.user_activity_events (
  id bigint primary key generated always as identity,
  user_id uuid not null,
  paper_id bigint references public.papers(id) on delete set null,
  event_type text not null,
  created_at timestamptz default now()
);
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events" ON public.user_activity_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events" ON public.user_activity_events
  FOR SELECT USING (auth.uid() = user_id);
