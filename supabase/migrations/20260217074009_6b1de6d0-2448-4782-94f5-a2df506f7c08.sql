
-- Add selected_personas column to papers table
ALTER TABLE public.papers 
ADD COLUMN selected_personas JSONB NOT NULL DEFAULT '["phd_postdoc"]'::jsonb;

-- Create paper_api_keys table
CREATE TABLE public.paper_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.paper_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view own API keys"
ON public.paper_api_keys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
ON public.paper_api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
ON public.paper_api_keys FOR DELETE
USING (auth.uid() = user_id);

-- Service role needs to read keys for validation in edge function
CREATE POLICY "Service role can read all keys"
ON public.paper_api_keys FOR SELECT
USING (true);
