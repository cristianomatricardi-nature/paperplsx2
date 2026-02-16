
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. USER PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  institution TEXT,
  bio TEXT,
  orcid TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. DIGITAL LAB INVENTORY
CREATE TABLE public.digital_lab_inventory (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('instrument', 'reagent', 'software', 'consumable', 'condition')),
  manufacturer TEXT,
  model_number TEXT,
  description TEXT,
  specifications JSONB,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PAPERS
CREATE TABLE public.papers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  authors JSONB,
  abstract TEXT,
  doi TEXT,
  journal TEXT,
  publication_date TEXT,
  source_type TEXT CHECK (source_type IN ('pdf_upload', 'doi')),
  storage_path TEXT,
  file_size BIGINT,
  num_pages INT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded', 'parsing', 'structuring', 'chunking', 'extracting_figures', 'completed', 'failed'
  )),
  error_message TEXT,
  simulated_impact_scores JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STRUCTURED PAPER DATA
CREATE TABLE public.structured_papers (
  paper_id BIGINT PRIMARY KEY REFERENCES public.papers(id) ON DELETE CASCADE,
  schema_version TEXT DEFAULT '2.0',
  metadata JSONB NOT NULL DEFAULT '{}',
  abstract TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  claims JSONB NOT NULL DEFAULT '[]',
  methods JSONB NOT NULL DEFAULT '[]',
  figures JSONB NOT NULL DEFAULT '[]',
  tables_data JSONB NOT NULL DEFAULT '[]',
  equations JSONB NOT NULL DEFAULT '[]',
  negative_results JSONB NOT NULL DEFAULT '[]',
  call_to_actions JSONB NOT NULL DEFAULT '[]',
  scicomm_hooks JSONB NOT NULL DEFAULT '[]',
  references_list JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RAG CHUNKS WITH EMBEDDINGS
CREATE TABLE public.chunks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  paper_id BIGINT NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  chunk_id TEXT NOT NULL,
  source_ids TEXT[] NOT NULL DEFAULT '{}',
  content TEXT NOT NULL,
  chunk_type TEXT CHECK (chunk_type IN (
    'claim', 'method_step', 'result', 'context', 'figure_description',
    'negative_result', 'call_to_action', 'scicomm_hook', 'abstract'
  )),
  module_relevance JSONB NOT NULL DEFAULT '{}',
  page_numbers INT[] NOT NULL DEFAULT '{}',
  embedding VECTOR(1536)
);

-- Index for paper_id filtering
CREATE INDEX idx_chunks_paper_id ON public.chunks(paper_id);

-- 6. GENERATED CONTENT CACHE
CREATE TABLE public.generated_content_cache (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  paper_id BIGINT NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('module', 'summary')),
  persona_id TEXT NOT NULL,
  module_id TEXT,
  content JSONB NOT NULL,
  source_chunks TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paper_id, content_type, persona_id, module_id)
);

-- 7. RAG SIMILARITY SEARCH FUNCTION
CREATE OR REPLACE FUNCTION public.match_chunks(
  p_paper_id BIGINT,
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 15,
  p_module_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id TEXT,
  content TEXT,
  chunk_type TEXT,
  page_numbers INT[],
  source_ids TEXT[],
  module_relevance JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.chunk_id,
    c.content,
    c.chunk_type,
    c.page_numbers,
    c.source_ids,
    c.module_relevance,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM chunks c
  WHERE c.paper_id = p_paper_id
    AND 1 - (c.embedding <=> p_query_embedding) > p_match_threshold
    AND (p_module_id IS NULL OR (c.module_relevance->>p_module_id)::FLOAT > 0.3)
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- 8. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_lab_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Digital Lab: users can CRUD own items
CREATE POLICY "Users can view own lab items" ON public.digital_lab_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lab items" ON public.digital_lab_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lab items" ON public.digital_lab_inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lab items" ON public.digital_lab_inventory FOR DELETE USING (auth.uid() = user_id);

-- Papers: users can CRUD own, read completed papers of others
CREATE POLICY "Users can view own papers" ON public.papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view completed papers" ON public.papers FOR SELECT USING (status = 'completed');
CREATE POLICY "Users can insert own papers" ON public.papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own papers" ON public.papers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own papers" ON public.papers FOR DELETE USING (auth.uid() = user_id);

-- Structured papers, chunks, cache: follow parent paper access (SELECT for authenticated users)
CREATE POLICY "Select follows paper" ON public.structured_papers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.papers WHERE papers.id = paper_id AND (papers.user_id = auth.uid() OR papers.status = 'completed')));

CREATE POLICY "Select follows paper" ON public.chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.papers WHERE papers.id = paper_id AND (papers.user_id = auth.uid() OR papers.status = 'completed')));

CREATE POLICY "Select follows paper" ON public.generated_content_cache FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.papers WHERE papers.id = paper_id AND (papers.user_id = auth.uid() OR papers.status = 'completed')));

-- Service role policies for edge functions (INSERT/UPDATE) — scoped to service_role only
CREATE POLICY "Service role can insert structured_papers" ON public.structured_papers FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update structured_papers" ON public.structured_papers FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can insert chunks" ON public.chunks FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can insert cache" ON public.generated_content_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update cache" ON public.generated_content_cache FOR UPDATE TO service_role USING (true);
