
-- Add author_enrichments JSONB column to structured_papers
ALTER TABLE public.structured_papers
ADD COLUMN IF NOT EXISTS author_enrichments jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add author_impact_scores JSONB column to papers
ALTER TABLE public.papers
ADD COLUMN IF NOT EXISTS author_impact_scores jsonb DEFAULT NULL;
