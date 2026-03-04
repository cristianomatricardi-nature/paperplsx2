

# Fix Debug Data in Three-Step Pipeline Debug Dialog

## Problem

The debug dialog in `InfographicPanel.tsx` expects rich data (`script_result`, `persona_variables`, `image_prompt`, `modules_used`, `claims_extracted`, etc.), but the edge function (line 422-433) only saves a minimal debug payload:

```json
{
  "step0_result": {...},
  "script_sections": ["header", "evidence_landscape", ...],  // just keys, not values!
  "persona": "think_tank",
  "models": [...],
  "claims_count": 4,
  "metrics_count": 3
}
```

The actual script, persona variables, image prompt, and module data are all discarded.

## Root Cause

The debug payload was intentionally stripped down in a previous fix to prevent the JSONB update from failing. But it was stripped too aggressively — removing the data you actually need to debug.

## Solution

Expand the debug payload in the edge function to include the three things you requested, while keeping it safe from the previous JSONB crash by writing it in a separate best-effort update (already in place):

### Edge Function (`generate-policy-infographic/index.ts`)

Update the debug payload (line 422-433) to include:

1. **Script tab**: Store the full `script` object (the structured JSON from Step 1 — header, key_findings, recommendations, etc.)
2. **Persona tab**: Store the `personaVars` object (contentGoal, statisticsDisplay, jargonLevel, etc.)
3. **Modules tab**: Store summaries of M1, M2, M5 module content, plus the extracted claims, metrics, and actions arrays
4. **Also include**: `step0_input`, `script_prompt` (the Step 1 prompt text), and `image_prompt`

To avoid the JSONB size issue that caused previous failures, truncate module content to first 2000 chars each.

```typescript
const debugPayload = {
  step0_input: step0Input,
  step0_result: step0Result,
  model_step0: "openai/gpt-5",
  script_prompt: step1Prompt.slice(0, 3000),
  script_result: script,
  model_step1: "openai/gpt-5.2",
  image_prompt: imagePrompt.slice(0, 3000),
  model_step2: "google/gemini-3-pro-image-preview",
  persona_variables: personaVars,
  modules_used: {
    M1: JSON.stringify(m1 ?? null).slice(0, 2000),
    M2: JSON.stringify(m2 ?? null).slice(0, 2000),
    M5: JSON.stringify(m5 ?? null).slice(0, 2000),
  },
  claims_extracted: claims,
  metrics_extracted: metrics,
  actions_extracted: { policy: policyActions, research: researchActions },
};
```

### Frontend — No structural changes needed

The `InfographicPanel.tsx` debug tabs already render all these fields correctly. Once the edge function stores the full debug payload, the Script, Persona, and Modules tabs will populate automatically.

### Files Changed
1. `supabase/functions/generate-policy-infographic/index.ts` — Expand the debug payload to include full script result, persona variables, module data, and prompts (with size truncation for safety)

