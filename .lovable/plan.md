

# Fix: `Cannot read properties of undefined (reading 'M1')` crash

## Root Cause

Two issues working together:

1. **Edge function** (`generate-policy-infographic/index.ts` line 449-463): The **success** debug payload is missing `modules_used`. It's only included in the "not relevant" response (line 238). So when infographic generation succeeds and `setDebugData(result.debug)` runs, `debugData.modules_used` is `undefined`.

2. **InfographicPanel.tsx** (line 325): `debugData?.modules_used[key]` — the optional chaining (`?.`) only protects if `debugData` is null. Once `debugData` is set (with no `modules_used`), `debugData.modules_used` is `undefined` and `undefined[key]` crashes. Radix Dialog renders children even when closed, so this crashes the whole component on re-render.

## Fix (2 changes)

### 1. `supabase/functions/generate-policy-infographic/index.ts` — Add `modules_used` to success debug

Line 449-463: Add the missing field to the success debug payload:
```typescript
debug: {
  ...existing fields...,
  modules_used: { M1: m1 ?? null, M2: m2 ?? null, M5: m5 ?? null },  // ADD THIS
  claims_extracted: claims,
  ...
}
```

### 2. `src/components/paper-view/views/InfographicPanel.tsx` — Add defensive optional chaining

Line 325: Change `debugData?.modules_used[key]` to `debugData?.modules_used?.[key]` to prevent crash even if the field is missing.

### Redeploy
Redeploy `generate-policy-infographic` after the edge function change.

### Files changed
1. `supabase/functions/generate-policy-infographic/index.ts` — add `modules_used` to success response debug (1 line)
2. `src/components/paper-view/views/InfographicPanel.tsx` — add `?.` optional chaining on `modules_used` (1 line)

