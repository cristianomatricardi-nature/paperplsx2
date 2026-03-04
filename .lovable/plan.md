

# Structural Fix: Fire-and-Poll Pattern for Infographic Generation

## Problem

The edge function completes all 3 AI steps successfully but crashes during the post-processing phase (base64 decode → storage upload → response serialization). The function never returns a response to the client, causing "Failed to fetch".

Root causes:
- Byte-by-byte base64 decoding of a multi-MB image hits the edge runtime's 2s CPU time limit
- If storage upload fails, the fallback embeds the entire base64 image in the JSON response (5-10MB+)
- The debug payload includes full module content and prompts, bloating the response

## Solution: Fire-and-Poll with Background Processing

### Database: New `infographic_jobs` table

```sql
create table public.infographic_jobs (
  id uuid primary key default gen_random_uuid(),
  paper_id bigint not null,
  sub_persona_id text not null,
  status text not null default 'processing', -- processing, complete, failed, not_relevant
  image_url text,
  policy_relevance_score integer,
  reason text,
  debug jsonb,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.infographic_jobs enable row level security;
create policy "Users can read own jobs" on public.infographic_jobs for select to authenticated using (true);
create policy "Service can manage jobs" on public.infographic_jobs for all to service_role using (true);
```

### Edge Function Changes (`generate-policy-infographic/index.ts`)

1. **Return immediately** with a job ID after creating the job record
2. **Use `EdgeRuntime.waitUntil()`** to run the pipeline in background
3. **Store results in `infographic_jobs`** instead of returning them in the response
4. **Fix base64 decode**: Use efficient chunk-based approach instead of byte-by-byte loop
5. **Never fall back to inline base64** — if upload fails, store an error
6. **Strip debug payload**: Only store essential debug info, not full module content

```typescript
// Return immediately
return new Response(JSON.stringify({ job_id: job.id }), { headers: corsHeaders });

// Background work via waitUntil
EdgeRuntime.waitUntil(async () => {
  // ... run steps 0, 1, 2 ...
  // ... upload to storage ...
  await supabase.from("infographic_jobs").update({
    status: "complete", image_url: storedUrl, debug: minimalDebug
  }).eq("id", job.id);
});
```

### Frontend Changes

**`src/lib/api.ts`** — New polling function:
```typescript
export async function generatePolicyInfographic(...) {
  // Start the job (fast, returns job_id)
  const { job_id } = await supabase.functions.invoke('generate-policy-infographic', { body: ... });
  // Poll for completion
  return pollInfographicJob(job_id);
}

async function pollInfographicJob(jobId: string): Promise<any> {
  const { data } = await supabase.from('infographic_jobs')
    .select('*').eq('id', jobId).single();
  if (data.status === 'complete' || data.status === 'not_relevant') return data;
  if (data.status === 'failed') throw new Error(data.error);
  await new Promise(r => setTimeout(r, 3000));
  return pollInfographicJob(jobId);
}
```

**`src/components/paper-view/views/InfographicPanel.tsx`** — Update `handleGenerate` to work with the new polling-based API. The component already has loading/error states that work well with this pattern.

### Files Changed
1. **New migration** — Create `infographic_jobs` table with RLS
2. **`supabase/functions/generate-policy-infographic/index.ts`** — Restructure to fire-and-poll with `EdgeRuntime.waitUntil()`
3. **`src/lib/api.ts`** — Replace direct invoke with start + poll pattern
4. **`src/components/paper-view/views/InfographicPanel.tsx`** — Adapt to new response shape from polling

