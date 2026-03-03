

# Enhance "Show Prompt" Debug Dialog

## What already works
The "Prompt" tab in the debug dialog already displays the **exact, word-by-word prompt text** sent to Gemini (stored as `debugData.prompt_text`). This is the verbatim content from the edge function.

## What will change

### `src/components/paper-view/views/InfographicPanel.tsx` — Prompt tab (lines 158-163)

Add an explanatory info box **above** the raw prompt, then a clear label confirming this is the verbatim prompt:

1. **Pipeline explanation block** (styled info box with a subtle background):
   - "This prompt was composed automatically from three cached analysis modules:"
   - **M1** (Overview and Metrics) -- core contribution title, up to 5 key metrics
   - **M2** (Claims and Evidence) -- up to 4 claims with evidence strength ratings
   - **M5** (Actions and Next Steps) -- policy and research action recommendations
   - "If available, the first page of the paper PDF was rendered and sent as visual context."
   - Dynamic counts: e.g., "3 claims, 5 metrics, 2 actions extracted" (from `debugData`)
   - PDF status and model name

2. **Separator**, then a label: "Exact prompt sent to Gemini (verbatim):"

3. **Raw prompt text** (existing `pre` block with `debugData.prompt_text` -- unchanged)

### No backend changes
The edge function already returns all required data. The `prompt_text` field is the exact string passed to Gemini's API.

