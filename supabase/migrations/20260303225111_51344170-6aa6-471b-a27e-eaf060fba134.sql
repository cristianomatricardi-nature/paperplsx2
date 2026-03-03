ALTER TABLE generated_content_cache 
  DROP CONSTRAINT generated_content_cache_content_type_check;

ALTER TABLE generated_content_cache 
  ADD CONSTRAINT generated_content_cache_content_type_check 
  CHECK (content_type = ANY (ARRAY['module', 'summary', 'policy_view', 'educator_view', 'funder_view']));