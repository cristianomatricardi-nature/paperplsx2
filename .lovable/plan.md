

# Rework Policy Infographic: Switch to Gemini with Module-Enriched Prompt

## Overview

Replace the current DALL-E 3 infographic generation with **Gemini** (`google/gemini-3-pro-image-preview`) via Lovable AI. The new prompt will pull precise data from cached M1, M2, and M5 modules, and optionally include the paper's first PDF page as visual context.

## Data Mapping

| Infographic Section | Source | Fields Used |
|---|---|---|
| Title and context | M1 | `core_contribution`, `field_impact`, paper title |
| Key results / evidence | M2 | Top 4 claims with strength labels |
| Metrics / numbers | M1 | `impact_analysis.metrics` (up to 5) |
| Call to action | M5 | `policy_actions` + `research_actions` (up to 4) |
| Visual style cues | `infographic_spec` | `key_visual_description` (from liquefaction) |

## Architecture Flow

```text
InfographicPanel (click "Generate")
       |
       v
  generate-policy-infographic edge function
       |
       +-- 1. Fetch cached M1, M2, M5 module content for this persona
       +-- 2. (Optional) Download PDF, render page 1 as base64 image
       +-- 3. Compose rich prompt with real module data
       +-- 4. Call Gemini via Lovable AI gateway (text + optional image)
       +-- 5. Extract base64 image from response
       +-- 6. Upload to paper-figures bucket, return public URL
```

## Changes

### 1. Edge function rewrite: `supabase/functions/generate-policy-infographic/index.ts`

- **Remove** DALL-E API call and `OPENAI_API_KEY` dependency
- **Add** Lovable AI gateway call using `LOVABLE_API_KEY` with model `google/gemini-3-pro-image-preview`
- **Accept** new `sub_persona_id` field in request body
- **Fetch module data** from `generated_content_cache` table for M1, M2, M5 using `paper_id` and `persona_id`
- **Fetch PDF** (optional): If paper has `storage_path`, download from `research-papers` bucket, convert page 1 to base64 using `pdfjs-serverless`
- **Compose prompt** like:

```text
Create a professional policy infographic for scientific research communication.

TITLE: {M1.core_contribution}
PAPER: {paper.title}

KEY RESULTS (from peer-reviewed evidence):
1. {M2.claim[0].statement} [{strength}]
2. {M2.claim[1].statement} [{strength}]
3. {M2.claim[2].statement} [{strength}]
4. {M2.claim[3].statement} [{strength}]

KEY METRICS:
- {M1.metrics[0].label}: {M1.metrics[0].value}
- {M1.metrics[1].label}: {M1.metrics[1].value}
...

RECOMMENDED ACTIONS:
1. {M5.policy_actions[0]}
2. {M5.policy_actions[1]}
3. {M5.research_actions[0]}

VISUAL GUIDANCE: {infographic_spec.key_visual_description}

Style: Clean government/policy report, dark teal (#006B7D) and white,
sans-serif, landscape format, include data charts where appropriate.
```

- If PDF image is available, send as multimodal `image_url` content alongside the text
- Upload returned base64 image to `paper-figures` bucket, return public URL
- Handle 429/402 rate limit errors gracefully

### 2. API client: `src/lib/api.ts`

- Update `generatePolicyInfographic` to accept and pass `subPersonaId: string`

### 3. Frontend: `src/components/paper-view/views/InfographicPanel.tsx`

- Accept new `subPersonaId` prop
- Pass it through to `generatePolicyInfographic`

### 4. Frontend: `src/components/paper-view/views/PolicyMakerView.tsx`

- Pass `subPersonaId` down to `InfographicPanel`

## Technical Notes

- `LOVABLE_API_KEY` is already configured -- no new secrets needed
- The `paper-figures` bucket is already public -- uploaded images are immediately accessible
- PDF rendering uses `pdfjs-serverless` (already used in `run-parser`)
- If PDF is unavailable or rendering fails, falls back to text-only prompt
- Module cache is queried server-side with `service_role` key -- no RLS issues
- Later switching to `google/gemini-2.5-flash-image` is a one-line model name change

