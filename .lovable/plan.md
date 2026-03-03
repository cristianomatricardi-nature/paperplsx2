

# Personalized Summary Card — Narrative Format, No Scores

## Changes

### 1. `supabase/functions/_shared/prompt-composers.ts` — `composeSummaryPrompt`
Update the TASK section to request a `narrative_summary` (150-200 word flowing paragraph walking through the paper) instead of `summary_points`. Remove `relevance_score` and `why_this_matters` from the JSON schema entirely. New output format:
```json
{ "narrative_summary": "..." }
```

### 2. `src/components/paper-view/PersonalizedSummaryCard.tsx`
- Update `SummaryContent` interface: replace `summary_points`, `relevance_score`, `why_this_matters` with just `narrative_summary: string`
- Rename heading from "Key Insights for {persona}" to "Personalized Summary"
- Replace bullet list with a single `<p>` rendering the narrative text with page-reference highlighting
- Remove relevance stars rendering and the `renderStars` function entirely
- Backward compatibility: if old cached `summary_points` exists, join into a paragraph

### 3. `supabase/functions/generate-summary/index.ts`
- Update fallback content to use `narrative_summary` instead of `summary_points`, remove `relevance_score` and `why_this_matters`

### No other file changes needed

