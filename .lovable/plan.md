

# Full Three-Step Policy Infographic Pipeline — Implementation Plan

## Current State

The `generate-policy-infographic` edge function currently does everything in **one step**: it extracts module data (M1, M2, M5), builds a text prompt, optionally renders PDF page 1, and sends it all directly to `google/gemini-3-pro-image-preview` for image generation. There is no evidence search, no script generation step, no persona variable injection, and no policy relevance gate.

The Springer Nature logo is already uploaded at:
`https://xgqfevxrifleenymsfhv.supabase.co/storage/v1/object/public/paper-figures//SN_logo_RGB (2).jpg`

## Problem: No Perplexity Connection

The Perplexity connector is **not connected yet**. There are no connections in the workspace. We need to connect Perplexity first to get `PERPLEXITY_API_KEY` as an environment variable. Without it, Step 0 (evidence search) cannot work.

## What We Need To Do

### 0. Connect Perplexity Connector
Use the Perplexity connector to inject `PERPLEXITY_API_KEY` into edge functions. This must happen before implementation.

### 1. Refactor Edge Function: `supabase/functions/generate-policy-infographic/index.ts`

Complete rewrite with three sequential AI calls:

**Step 0 — Evidence Search (Perplexity `sonar-pro`)**
- Fetch paper metadata (title, DOI, abstract) from `papers` table
- Generate 3 search queries from M1 core contribution (systematic reviews, policy reports, contradictory evidence)
- Call Perplexity API (`https://api.perplexity.ai/chat/completions`) with `model: "sonar-pro"` and `search_mode: "academic"`
- System prompt instructs critical honesty: "If this paper has no meaningful policy connection, say so."
- Parse response for `citations` array (real URLs) and evidence landscape text
- **Policy Relevance Gate**: If Perplexity determines no genuine policy relevance, return early with `{ success: true, policy_relevant: false, reason: "..." }` — no image generated

**Step 1 — Script Generation (`openai/gpt-5.2` via Lovable gateway)**
- Look up sub-persona from `SUB_PERSONA_REGISTRY` (e.g., `think_tank` or `gov_institution`)
- Inject persona variables: `contentGoal`, `statisticsDisplay`, `jargonLevel`, `languageStyle`, `disclaimers`, `depthPreference`
- Combine with: module data (M1 metrics, M2 claims, M5 actions) + Step 0 evidence context
- Use tool calling to extract structured JSON script:
  ```
  { header, evidence_landscape, key_findings[], recommendations[], 
    key_takeaway, source_citation, evidence_citations[], disclaimer }
  ```

**Step 2 — Image Generation (`google/gemini-3-pro-image-preview`)**
- Build content parts array with:
  1. Text prompt (the finalized layout template with Step 1 script sections inserted)
  2. Springer Nature logo as `image_url` reference: `https://xgqfevxrifleenymsfhv.supabase.co/storage/v1/object/public/paper-figures//SN_logo_RGB (2).jpg`
  3. Optional PDF page 1 (existing logic, kept as visual context)
- Prompt text (exactly as specified):
  ```
  A professional, single-page infographic-style visual explainer
  with a clean, top-to-bottom schematic flow.

  Layout: Distinct sections separated by clean lines.
  Content to render:
  - Top Header: [header from Step 1]
  - Context Bar: [evidence_landscape from Step 1 with citation count]
  - Central Section: data viz boxes with [key_findings from Step 1],
    flat vector icons
  - Highlighted Box: [key_takeaway from Step 1]
  - Action Strip: [recommendations from Step 1]
  - Footer: [source_citation + evidence_citations from Step 1]

  Style: Use Merriweather Sans typography for all text.
  Strictly follow a five-color palette: Universal Blue, Deep Teal Blue,
  Orange, Green, and Purple. Flat vector icons only;
  no photographic elements.

  Logo placement: In the bottom-right corner, reproduce the Springer
  Nature logo exactly as shown in the attached reference image. Place
  it on a light background. Do not modify, redraw, or stylize the
  logo — use it as-is.

  Vibe: Clean, academic, highly organized, and modern.
  ```
- Upload resulting PNG to `paper-figures` bucket, return public URL

**Debug payload** (returned to frontend):
```
{ evidence_context, search_citations[], persona_variables, 
  script_prompt, script_result, image_prompt, policy_relevant,
  prompt_text (legacy), model, modules_used, pdf_included, 
  claims_extracted, metrics_extracted, actions_extracted }
```

### 2. Update Frontend: `src/components/paper-view/views/InfographicPanel.tsx`

- Expand `DebugPayload` interface with new fields: `evidence_context`, `search_citations`, `persona_variables`, `script_result`, `policy_relevant`, `policy_relevance_reason`
- Handle `policy_relevant: false` response — show an explanation card with the reason instead of the generate button/image
- Add debug tabs: **Evidence** (search context + citation URLs), **Script** (Step 1 structured output), **Persona** (injected persona variables)
- Update pipeline explanation text in debug panel to describe three-step process

### 3. No changes to `src/lib/api.ts`
The function signature stays identical — the edge function handles all orchestration internally.

### 4. No database changes needed.

## Data Flow Diagram

```text
Frontend (InfographicPanel)
  │
  ├─ Calls: generatePolicyInfographic(paperId, title, spec, subPersonaId)
  │
  └─► Edge Function: generate-policy-infographic
       │
       ├─ Fetch paper metadata (papers table)
       ├─ Fetch cached modules M1, M2, M5 (generated_content_cache)
       ├─ Look up SUB_PERSONA_REGISTRY[subPersonaId]
       │
       ├─► STEP 0: Perplexity sonar-pro (academic search)
       │    └─ Policy Relevance Gate
       │         ├─ NOT relevant → return { policy_relevant: false }
       │         └─ relevant → continue
       │
       ├─► STEP 1: openai/gpt-5.2 (script generation)
       │    └─ Returns structured JSON script
       │
       ├─► STEP 2: google/gemini-3-pro-image-preview
       │    ├─ Text prompt with Step 1 sections
       │    ├─ SN logo URL as image_url reference
       │    └─ Optional PDF page 1 as image_url
       │
       ├─ Upload PNG to paper-figures bucket
       └─ Return { image_url, debug, policy_relevant: true }
```

## Implementation Order

1. Connect Perplexity connector (prerequisite)
2. Refactor edge function (all three steps + logo reference + debug payload)
3. Deploy and test edge function
4. Update InfographicPanel with new debug tabs and policy relevance gate UI

