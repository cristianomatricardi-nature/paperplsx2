

# Fix: Infographic Generation "Failed to send a request"

## Architecture of the 3-Step Pipeline

```text
Client (InfographicPanel.tsx)
  │
  └─► generatePolicyInfographic() in api.ts
        │
        └─► supabase.functions.invoke()  ← ⚠️ DEFAULT TIMEOUT (~60s)
              │
              └─► Edge Function: generate-policy-infographic/index.ts
                    │
                    ├── Step 0: GPT-5 (policy relevance)      ~10-15s
                    ├── Step 1: GPT-5.2 (script generation)   ~10-15s
                    ├── PDF rendering (skipped — getDocument not available in Deno)
                    └── Step 2: Gemini 3 Pro Image Preview    ~20-30s
                                                              ─────────
                                                     Total:  ~40-60s+
```

## Root Cause

**Same timeout issue as the policy view.** `generatePolicyInfographic()` in `api.ts` uses `supabase.functions.invoke()` which has a short default timeout. The 3-step pipeline (3 sequential AI calls) takes 40-60+ seconds, causing the client to abort.

The `longRunningInvoke` helper already exists in the file but is not used for this function.

The logs confirm: Step 0 succeeds, Step 1 succeeds, PDF skip is handled, then **shutdown** — Step 2 never completes because the connection is dropped.

## Fix

### `src/lib/api.ts` — Switch `generatePolicyInfographic` to use `longRunningInvoke`

Replace the current `supabase.functions.invoke()` call with the existing `longRunningInvoke` helper:

```typescript
export async function generatePolicyInfographic(
  paperId: number,
  paperTitle: string,
  infographicSpec: { title: string; sections: string[]; key_visual_description: string },
  subPersonaId?: string,
) {
  return longRunningInvoke('generate-policy-infographic', {
    paper_id: paperId,
    paper_title: paperTitle,
    infographic_spec: infographicSpec,
    sub_persona_id: subPersonaId,
  });
}
```

This gives the function a 120-second timeout instead of the default ~60s.

### Files changed
1. `src/lib/api.ts` — `generatePolicyInfographic` uses `longRunningInvoke` (5 lines changed)

