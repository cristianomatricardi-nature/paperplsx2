

# Fix: Client-Side Timeout for Policy View

## Root Cause

The `generate-policy-view` edge function works correctly — data is cached for paper 42 + think_tank. The "Failed to send a request" error is a **client-side timeout**: `supabase.functions.invoke()` uses the browser's default fetch timeout (~60s), and on first generation the function takes longer (it generates 3 missing modules inline + one GPT-5 call).

Once cached, subsequent calls return instantly. But the first call can timeout on the client side even though the server succeeds.

## Fix

Replace `supabase.functions.invoke()` with raw `fetch` + `AbortSignal.timeout(120_000)` for the three long-running view functions in `src/lib/api.ts`:

### `src/lib/api.ts` — 3 functions updated

```typescript
export async function fetchPolicyView(paperId: number, subPersonaId: string) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-policy-view`;
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ paper_id: paperId, sub_persona_id: subPersonaId }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Edge function error: ${response.status}`);
  return response.json();
}
```

Same pattern for `fetchFunderView` and `fetchEducatorView`.

### Files changed
1. `src/lib/api.ts` — `fetchPolicyView`, `fetchFunderView`, `fetchEducatorView` use raw fetch with 120s timeout

