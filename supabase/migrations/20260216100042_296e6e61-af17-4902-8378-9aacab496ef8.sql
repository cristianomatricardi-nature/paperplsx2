
-- Create storage bucket for extracted figure images
INSERT INTO storage.buckets (id, name, public)
VALUES ('paper-figures', 'paper-figures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view figure images (public bucket)
CREATE POLICY "Figure images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'paper-figures');

-- Allow service role to upload figure images (edge functions use service role)
CREATE POLICY "Service role can upload figures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'paper-figures');

-- Allow service role to update/overwrite figure images
CREATE POLICY "Service role can update figures"
ON storage.objects FOR UPDATE
USING (bucket_id = 'paper-figures');

-- Allow service role to delete figure images
CREATE POLICY "Service role can delete figures"
ON storage.objects FOR DELETE
USING (bucket_id = 'paper-figures');
