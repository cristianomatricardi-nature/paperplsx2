

# Reduce Text in Policy Infographic

## Where to act

**Both Step 1 and Step 2** — they work together:

- **Step 1 (Script Generation)** controls *what text is produced*. Currently it generates long-form fields: `header`, `evidence_landscape`, `key_findings` (with verbose `value` strings), `recommendations`, `key_takeaway`, `source_citation`, and `disclaimer`. The system prompt says "be concise" but doesn't enforce hard limits.

- **Step 2 (Image Prompt)** controls *how text is rendered visually*. Currently it asks the image model to render all that text verbatim — header, context bar, findings, recommendations, footer, disclaimer — resulting in a text-heavy image.

**Step 0 is irrelevant** — it only gates relevance (score 1-10), no text generation.

## Changes

### Step 1 — Constrain the script schema and prompt

1. **Add strict character limits** in the system prompt:
   - Header: ≤10 words
   - Evidence landscape: ≤15 words (one-liner context)
   - Key findings: max 3 items, each `label` ≤4 words, `value` ≤6 words (numbers preferred)
   - Recommendations: max 2, each ≤8 words
   - Key takeaway: ≤12 words
   - Source citation: ≤15 words
   - Remove `disclaimer` entirely from the schema (or make it ≤10 words)

2. **Update the system prompt** to emphasize: "Policy makers scan, not read. Maximize numbers and icons. Minimize prose. Every field must be scannable in under 2 seconds."

### Step 2 — Shift the image prompt toward visual elements

1. **Rewrite the image prompt** to emphasize:
   - Large data-viz elements (big numbers, progress bars, icon grids)
   - Minimal text labels — short phrases only
   - 60% visual / 40% text ratio
   - Remove the "Context Bar" as a text block — fold into a subtle subtitle
   - Render findings as icon + number pairs, not sentences
   - Recommendations as icon bullets, not full sentences

### Files changed
1. `supabase/functions/generate-policy-infographic/index.ts` — Update Step 1 system prompt with word limits + scan-first instructions; update Step 2 image prompt to prioritize visuals over text

