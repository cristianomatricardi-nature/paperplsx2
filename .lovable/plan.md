

# Revised Plan: Three-Step Pipeline Using Only Lovable AI Models

## What changed

**Step 0 no longer uses Perplexity.** Instead, we use `openai/gpt-5` via the Lovable AI gateway to perform the evidence contextualization and policy relevance assessment. It won't do live web search, but it can critically assess policy relevance from the paper's own module data (M1, M2, M5) and general knowledge — which is sufficient for the policy relevance gate.

## Revised Architecture

```text
Step 0: POLICY RELEVANCE ASSESSMENT (openai/gpt-5 — free via Lovable AI)
  → Analyzes M1/M2/M5 module data for genuine policy connections
  → Policy Relevance Gate (honest: no fabricated connections)
  → Output: evidence_landscape summary, policy_relevant boolean

Step 1: SCRIPT GENERATION (openai/gpt-5.2 — free via Lovable AI)
  → Module data + Step 0 context + persona variables
  → Structured JSON script for infographic sections

Step 2: IMAGE GENERATION (google/gemini-3-pro-image-preview — free via Lovable AI)
  → Step 1 script + SN logo reference image → PNG
  → 5-color palette, Merriweather Sans, top-to-bottom layout
```

All three steps use the Lovable AI gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) — no external API keys needed.

## Changes Required

### 1. Edge function: `supabase/functions/generate-policy-infographic/index.ts`

Complete refactor with three sequential calls, all to `ai.gateway.lovable.dev`:

**Step 0** — `openai/gpt-5` — Policy relevance assessment
- System prompt: "You are a critical policy analyst. Assess whether this research has genuine, meaningful policy implications. Be honest — if the research is purely theoretical or has no clear policy connection, say so."
- Input: M1 core contribution, M2 claims, M5 actions, paper title
- Output JSON: `{ policy_relevant: boolean, reason: string, evidence_landscape: string }`
- If `policy_relevant: false` → return early, no image generated

**Step 1** — `openai/gpt-5.2` — Script generation with persona variables
- Look up sub-persona from `SUB_PERSONA_REGISTRY` (contentGoal, statisticsDisplay, jargonLevel, etc.)
- Input: module data + Step 0 evidence landscape + persona variables
- Output JSON: `{ header, evidence_landscape, key_findings[], recommendations[], key_takeaway, source_citation, disclaimer }`

**Step 2** — `google/gemini-3-pro-image-preview` — Image generation
- Content parts: text prompt (with Step 1 sections inserted) + SN logo URL as `image_url` reference + optional PDF page 1
- Prompt uses Merriweather Sans, 5-color palette, instructs "reproduce the Springer Nature logo exactly as shown in the attached reference image"
- Upload PNG to `paper-figures` bucket

**Debug payload** includes all three steps' inputs/outputs.

### 2. Frontend: `src/components/paper-view/views/InfographicPanel.tsx`

- Handle `policy_relevant: false` — show explanation card with reason
- Update `DebugPayload` with: `evidence_landscape`, `persona_variables`, `script_result`, `policy_relevant`, `policy_relevance_reason`
- Add debug tabs: "Evidence" (Step 0 assessment), "Script" (Step 1 output), "Persona" (injected variables)

### 3. No database changes, no external API keys, no connectors needed.

## Trade-off

Without Perplexity, Step 0 cannot do live academic web search (no real-time citation URLs from systematic reviews). But it can still:
- Critically assess policy relevance from the paper's own data
- Provide an evidence landscape summary based on the model's training knowledge
- Honestly gate non-policy research from generating infographics

If you add Perplexity later, Step 0 simply swaps to use the Perplexity API for real-time citations.

