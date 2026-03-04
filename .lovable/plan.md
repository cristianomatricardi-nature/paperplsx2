

# Fix: Increase Client Timeout for Infographic Generation

## Root Cause

The edge function now works — all 3 steps complete. But the total wall time from the client's perspective is ~103s for the pipeline plus cold boot time and network latency, which pushes past the 120s `AbortSignal.timeout` in `longRunningInvoke`.

The `longRunningInvoke` helper is shared by multiple functions. Increasing its timeout globally is safe, but alternatively we can pass a custom timeout for the infographic call.

## Fix

### `src/lib/api.ts` — Add optional timeout parameter to `longRunningInvoke` and use 300s for infographic

```typescript
async function longRunningInvoke(functionName: string, body: Record<string, unknown>, timeoutMs = 120_000) {
  // ... existing code but use timeoutMs instead of hardcoded 120_000
  signal: AbortSignal.timeout(timeoutMs),
}
```

Then in `generatePolicyInfographic`, pass a 5-minute timeout:

```typescript
export async function generatePolicyInfographic(...) {
  return longRunningInvoke('generate-policy-infographic', { ... }, 300_000);
}
```

### Files changed
1. `src/lib/api.ts` — Add `timeoutMs` parameter to `longRunningInvoke` (default 120s), use 300s for infographic call

