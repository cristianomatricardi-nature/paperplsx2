

# Fix Module Title Generation + DOI Layout

## Root Cause Found

The `generate-module-titles` edge function **crashes with a DNS error** because it uses the wrong AI gateway URL:
- **Wrong**: `https://ai-gateway.lovable.dev/chat/completions`
- **Correct**: `https://ai.gateway.lovable.dev/v1/chat/completions`

Additionally, the orchestrator marks the pipeline as "completed" **without waiting** for titles to finish (line 208: "Module titles are non-blocking").

## Changes

### 1. Fix AI gateway URL — `supabase/functions/generate-module-titles/index.ts`
Change the fetch URL from `https://ai-gateway.lovable.dev/chat/completions` to `https://ai.gateway.lovable.dev/v1/chat/completions` (matching the pattern used by all other working functions).

### 2. Wait for titles before completing — `supabase/functions/orchestrate-pipeline/index.ts`
After firing `generate-module-titles` and `generate-simulated-impact`, poll for **both** conditions before marking completed:
- Simulated impact scores (already polled)
- Module titles (add poll: check `structured_papers.module_titles` is non-empty object with at least M1 key)

### 3. DOI in header row — `src/components/paper-view/ModuleAccordion.tsx`
- Remove the separate `border-t` footer div for the DOI
- Place the DOI string inside the header button row, right-aligned next to the chevron, as a small mono-font label
- This eliminates extra vertical space and keeps DOI visible when collapsed

### Files
| File | Change |
|------|--------|
| `supabase/functions/generate-module-titles/index.ts` | Fix URL |
| `supabase/functions/orchestrate-pipeline/index.ts` | Poll for module_titles before completing |
| `src/components/paper-view/ModuleAccordion.tsx` | Move DOI to header row, right-aligned |

