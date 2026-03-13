

# Fix Library Paper Upload

## Problem
The `upload-handler` edge function crashes with `"Body can not be decoded as form data"` because `supabase.functions.invoke()` doesn't properly transmit `FormData` to the Deno runtime. This means **no library papers can be uploaded**, so the "What To Do Now" personalization has zero library context to work with.

## Root Cause
`supabase.functions.invoke('upload-handler', { body: formData })` — the JS client serializes or mangles the multipart boundary, causing `req.formData()` to fail in the edge function.

## Fix: Direct `fetch` Instead of `supabase.functions.invoke`

### 1. `src/components/researcher-home/PaperLibrary.tsx` — Fix the upload call
Replace `supabase.functions.invoke` with a direct `fetch` to the edge function URL, which correctly preserves the `FormData` multipart boundary:

```typescript
const session = (await supabase.auth.getSession()).data.session;
const res = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-handler`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: formData, // browser auto-sets Content-Type with boundary
  }
);
if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
const data = await res.json();
```

### 2. `src/lib/api.ts` — Fix `uploadPaper` too (same bug)
Same change for the `uploadPaper` function used by the Paper++ upload flow.

### 3. No edge function changes needed
The `upload-handler` edge function code is correct — it properly handles `req.formData()`. The bug is purely client-side.

## Pipeline Flow (already correct)
Once upload succeeds:
1. **upload-handler** stores file, creates paper record with `source_type='library'`
2. Client fires `orchestrate-pipeline` with `library_only=true`
3. Pipeline: parse → structure (extracts title, abstract, authors) → chunk → mark `completed`
4. **generate-summary** finds library papers with `source_type='library'` + `status='completed'` and uses their titles/abstracts for personalized "What To Do Now"

## Files Changed

| File | Change |
|------|--------|
| `src/components/researcher-home/PaperLibrary.tsx` | Replace `supabase.functions.invoke` with direct `fetch` for upload |
| `src/lib/api.ts` | Same fix for `uploadPaper` function |

