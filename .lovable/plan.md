

# Connect Policy Relevance: Unified 1-10 Score

## Problem
Step 0 (infographic) returns `policy_relevant: boolean`. The Policy View returns `relevance_score: 1-10`. They use different models, different prompts, and can contradict each other.

## Solution
Two changes to create a single, consistent scoring system:

### 1. Step 0 in `generate-policy-infographic/index.ts` — return 1-10 score instead of boolean

Change the `assess_policy_relevance` tool schema:
- Replace `policy_relevant: boolean` with `policy_relevance_score: integer (1-10)` using the same calibration scale
- Keep `reason` and `evidence_landscape`
- Gate logic: score ≤ 5 → no infographic, score 6-10 → proceed
- Update system prompt to include the 1-10 calibration instructions

### 2. Policy Maker `liquefactionPrompt` in `parent-personas.ts` — add calibration + use same model

Two sub-changes:
- **Switch model**: `generate-policy-view/index.ts` line 156-163 — change from `api.openai.com` with `gpt-4o` to `ai.gateway.lovable.dev` with `openai/gpt-5` (same model as Step 0)
- **Add calibration instructions** to the prompt in `parent-personas.ts` before the JSON schema, so `relevance_score` and `policy_relevance_score` use the exact same scale:
  - 1-3: No genuine policy connection
  - 4-5: Weak/tangential
  - 6-7: Indirect but meaningful
  - 8-10: Directly informs specific policy decisions

This way both systems use:
- Same model (`openai/gpt-5`)
- Same calibration scale (1-10 with identical definitions)
- Aligned gate: Policy View score ≤ 5 = Step 0 would block infographic; score ≥ 6 = Step 0 would allow it

### 3. Frontend `InfographicPanel.tsx` — minor update

Update to read `policy_relevance_score` (number) instead of `policy_relevant` (boolean). Show the score in the "not relevant" card. Gate: `score <= 5` shows explanation, `score >= 6` proceeds.

### Files changed
1. `supabase/functions/generate-policy-infographic/index.ts` — Step 0 tool schema + gate logic
2. `supabase/functions/_shared/parent-personas.ts` — calibration instructions in Policy Maker prompt
3. `supabase/functions/generate-policy-view/index.ts` — switch to Lovable AI gateway + `openai/gpt-5`
4. `src/components/paper-view/views/InfographicPanel.tsx` — read score instead of boolean

