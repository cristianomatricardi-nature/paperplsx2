ALTER TABLE public.papers DROP CONSTRAINT papers_source_type_check;
ALTER TABLE public.papers ADD CONSTRAINT papers_source_type_check CHECK (source_type IN ('pdf_upload', 'doi', 'library'));