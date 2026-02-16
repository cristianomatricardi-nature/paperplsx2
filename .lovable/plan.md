

## Fix: Add Fallback to generate-summary (Same Pattern as generate-module-content)

### Problem

The `generate-summary` function uses a similarity threshold of 0.5 with no fallback. Paper 8 has 11 chunks with valid embeddings, but none score above 0.5 similarity for the generic summary query. The function throws "No matching chunks found" and falls back to the abstract instead of generating a real personalized summary.

The `generate-module-content` function was already fixed with this fallback pattern, but the same fix was never applied to `generate-summary`.

### Fix

**File: `supabase/functions/generate-summary/index.ts`** (lines 92-107)

Add a fallback retry with a lower threshold (0.3) when the initial query returns no chunks — identical to the pattern already used in `generate-module-content`:

```
// Current code (no fallback):
const { data: chunks, error } = await supabase.rpc("match_chunks", {
  p_paper_id: paperId,
  p_query_embedding: JSON.stringify(queryEmbedding),
  p_match_threshold: 0.5,
  p_match_count: 12,
});
if (!chunks || chunks.length === 0) {
  throw new Error("No matching chunks found");
}

// Fixed code (with fallback):
let { data: chunks, error } = await supabase.rpc("match_chunks", { ... threshold: 0.5 });

if (!chunks || chunks.length === 0) {
  // Retry with relaxed threshold
  const fallback = await supabase.rpc("match_chunks", {
    p_paper_id: paperId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_threshold: 0.2,
    p_match_count: 12,
  });
  chunks = fallback.data;
}
```

After editing, redeploy both `generate-summary` and `generate-module-content`.

### No other files change

The frontend code and the `generate-module-content` function already have the correct logic. This is a one-file fix.
