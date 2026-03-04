
CREATE TABLE public.audio_hook_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id BIGINT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  sub_persona_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  audio_url TEXT,
  script TEXT,
  call_to_actions JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paper_id, sub_persona_id)
);

ALTER TABLE public.audio_hook_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audio hook jobs"
  ON public.audio_hook_jobs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role full access on audio_hook_jobs"
  ON public.audio_hook_jobs FOR ALL
  USING (true)
  WITH CHECK (true);
