
-- Create storage bucket for research papers
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('research-papers', 'research-papers', false, 20971520);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own papers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own papers
CREATE POLICY "Users can read own papers"
ON storage.objects FOR SELECT
USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own papers
CREATE POLICY "Users can delete own papers"
ON storage.objects FOR DELETE
USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role needs access for edge functions
CREATE POLICY "Service role full access research-papers"
ON storage.objects FOR ALL
USING (bucket_id = 'research-papers')
WITH CHECK (bucket_id = 'research-papers');
