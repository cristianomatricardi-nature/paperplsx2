

## Fix: `SUPABASE_PUBLISHABLE_KEY` to `SUPABASE_ANON_KEY`

### Problem
Two edge functions crash on startup because they reference a non-existent environment variable `SUPABASE_PUBLISHABLE_KEY`. The correct variable name in the edge function runtime is `SUPABASE_ANON_KEY`.

### Changes

**1. `supabase/functions/upload-handler/index.ts` (line 30)**
Change:
```
Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
```
To:
```
Deno.env.get("SUPABASE_ANON_KEY")
```

**2. `supabase/functions/doi-resolver/index.ts` (line 29)**
Change:
```
Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
```
To:
```
Deno.env.get("SUPABASE_ANON_KEY")
```

### Why
The Deno edge function runtime auto-provides three environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY`. The name `SUPABASE_PUBLISHABLE_KEY` is a Lovable frontend convention (used as `VITE_SUPABASE_PUBLISHABLE_KEY`) but does not exist in the backend runtime.

### No Other Issues Found
All other functions (`run-parser`, `run-structuring`, `run-chunking-and-embedding`, `orchestrate-pipeline`) are deployed, reachable, and return correct error messages when called without valid test data. The pipeline logic is sound.

