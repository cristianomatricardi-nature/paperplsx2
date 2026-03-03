

# Fix PhD Summary + Add Depth-Based Length

## Problem
Two issues:
1. The PhD/Post-doc summary is serving **old cached data** (bullet-point format from before the module-fusion change). It needs to be cleared so the new narrative format generates.
2. The prompt uses a flat "200 words" cap for all personas. PhD/Post-doc (`exhaustive`) should get more detail.

## Changes

### 1. Clear stale PhD summary cache
Delete the old cached summary for `phd_postdoc` (and any other old-format entries) from `generated_content_cache` so the new module-fusion code runs fresh. This is a one-time database operation.

### 2. `supabase/functions/_shared/prompt-composers.ts` — Dynamic word count
Add a word-range lookup based on `persona.depthPreference` before the TASK block:

| depthPreference | Word range |
|-----------------|-----------|
| `exhaustive`    | 250–350   |
| `balanced`      | 180–250   |
| `executive`     | 120–160   |

Replace the hardcoded "Maximum 200 words" in the TASK section (line 99) with the dynamic range. Everything else in the prompt stays the same.

### What is NOT changing
- The What/Why/How narrative structure is already correctly in the prompt (lines 92–97)
- Module-fusion logic in `generate-summary/index.ts` — already correct
- Frontend `PersonalizedSummaryCard.tsx` — already handles `narrative_summary` and `disclaimer`

