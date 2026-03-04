

# Fix: Infographic Job Status Never Updates

## Root Cause

The edge function's `runPipeline` successfully:
1. Runs Step 0 (score: 8) 
2. Runs Step 1 (script generated)
3. Runs Step 2 (image generated + uploaded)

But the final `supabase.from("infographic_jobs").update({...}).eq("id", jobId)` on line 392 **silently fails** -- the `{ error }` return is never checked or logged. The row stays `processing` forever.

The likely cause: the `debug` JSONB payload contains problematic content (e.g., the `image_prompt` has multi-line strings with special characters, or the `script_result` has nested objects that exceed JSONB limits). The update fails, returns an error object, but no one reads it.

## Fix

### `supabase/functions/generate-policy-infographic/index.ts`

Two changes:

1. **Add error checking and logging** to both update calls (the "complete" update on line 392 and the "not_relevant" update on line 210).

2. **Separate the update into two calls**: first update `status`/`image_url`/`policy_relevance_score` (critical data), then try to add `debug` separately. If the debug update fails, log it but don't crash — the job still completes.

```typescript
// Line 392-408: Replace with:
const { error: updateError } = await supabase.from("infographic_jobs").update({
  status: "complete",
  image_url: storedUrl,
  policy_relevance_score: policyScore,
}).eq("id", jobId);

if (updateError) {
  console.error("[generate-policy-infographic] CRITICAL: job update failed:", updateError);
  throw new Error(`Job update failed: ${updateError.message}`);
}
console.log("[generate-policy-infographic] Job marked complete");

// Best-effort debug update (non-critical)
try {
  const debugPayload = JSON.parse(JSON.stringify({
    step0_result: step0Result,
    script_sections: Object.keys(script || {}),
    persona: subPersonaId,
    models: ["openai/gpt-5", "openai/gpt-5.2", "google/gemini-3-pro-image-preview"],
    claims_count: claims.length,
    metrics_count: metrics.length,
  }));
  await supabase.from("infographic_jobs").update({ debug: debugPayload }).eq("id", jobId);
} catch (debugErr) {
  console.warn("[generate-policy-infographic] Debug update failed (non-critical):", debugErr);
}
```

3. **Same pattern for the "not_relevant" update** (~line 210): add error checking.

4. **Add a log after the catch in `EdgeRuntime.waitUntil`** to confirm error handling fires.

### Files Changed
1. `supabase/functions/generate-policy-infographic/index.ts` — Add error checking to all `.update()` calls, separate critical updates from debug payload

