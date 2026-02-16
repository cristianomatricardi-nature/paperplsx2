

## Fix: Missing Figures and Failed Bounding Box Extraction

### Problem Summary

Two distinct issues on paper 14:

1. **Only 2 of 4 figures detected** -- the structuring step uses text-only analysis (GPT-4o with page text). It missed 2 figures that may not have clear textual captions or references.
2. **Bounding boxes failed** -- the `run-figure-extraction` edge function sent the PDF to OpenAI Responses API, but the model refused: *"I'm unable to extract bounding boxes from PDF figures directly."* Result: 0 of 2 bounding boxes detected, so even the 2 known figures show as placeholders.

### Fix 1: Improve Figure Detection in Structuring Prompt

**File: `supabase/functions/run-structuring/index.ts`**

Add stronger instructions to the structuring prompt to ensure ALL figures are captured:

- Add to the RULES section: *"Extract EVERY figure referenced in the paper, including subfigures (e.g., Fig. 2a, 2b). Check every page for figure captions starting with 'Fig.', 'Figure', or similar. A typical paper has 3-8 figures."*
- This won't fix paper 14 retroactively, but prevents the issue for future papers.

### Fix 2: Make Bounding Box Extraction More Robust

**File: `supabase/functions/run-figure-extraction/index.ts`**

The OpenAI Responses API sometimes refuses to process PDF files. Fix with:

1. **Retry with stronger system prompt** -- prefix the prompt with explicit instructions that the model CAN and SHOULD analyze the provided PDF document
2. **Add a retry mechanism** -- if the first attempt fails or returns "unable", retry once with a rephrased prompt
3. **Fallback: full-page rendering** -- if bounding box detection still fails, set a default bounding box of `{x: 0.05, y: 0.05, width: 0.9, height: 0.9}` so the FigureRenderer at least shows the full page where the figure exists, rather than nothing

### Fix 3: Re-run Extraction for Paper 14

After deploying the improved edge function:

- Manually invoke `run-figure-extraction` for paper 14 to populate bounding boxes
- Optionally re-run `run-structuring` for paper 14 to capture the missing 2 figures (though this resets all structured data)

### Technical Details

**`run-figure-extraction/index.ts` changes:**

- Update the `buildPrompt` function to include a stronger system-level instruction: *"You are analyzing a PDF document that has been provided to you. Examine each page and locate the figures listed below."*
- Add retry logic in `extractBoundingBoxes`: if the parsed result is empty and the raw text contains refusal phrases ("unable", "cannot", "can't"), retry with an alternative prompt
- Add fallback: after all retries, for any figure without a bounding box, assign a full-page default box so the page is at least rendered

**`run-structuring/index.ts` changes:**

- Add to RULES in the prompt: *"Extract ALL figures. Scan every page for 'Fig.', 'Figure', or image captions. Include subfigures. Do NOT skip any visual element."*

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/run-figure-extraction/index.ts` | Stronger prompt, retry logic, full-page fallback |
| `supabase/functions/run-structuring/index.ts` | Add explicit figure extraction rules to prompt |

### What stays the same

- `FigureCard.tsx`, `FiguresSection.tsx`, `FigureRenderer.tsx` -- no UI changes needed
- Database schema -- no changes
- Pipeline orchestration -- no changes

