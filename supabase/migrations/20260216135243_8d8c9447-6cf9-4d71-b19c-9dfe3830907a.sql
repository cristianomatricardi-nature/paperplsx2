CREATE OR REPLACE FUNCTION public.match_chunks(p_paper_id bigint, p_query_embedding extensions.vector, p_match_threshold double precision DEFAULT 0.7, p_match_count integer DEFAULT 15, p_module_id text DEFAULT NULL::text)
 RETURNS TABLE(chunk_id text, content text, chunk_type text, page_numbers integer[], source_ids text[], module_relevance jsonb, similarity double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;