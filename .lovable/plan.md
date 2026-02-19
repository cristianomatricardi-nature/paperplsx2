# Revised Plan: Persona-Driven Visualization Paradigm (Policy Maker Phase)

## What Exists Today — Exact Architecture

Before prescribing changes, here is the precise current state:

**The dispatch pattern (PaperViewPage.tsx line 254):**

```
if (subPersonaId === 'ai_agent') → <AiAgentConsole />
else                             → PersonalizedSummaryCard + ModuleAccordionList + FiguresSection
```

**AiAgentConsole** is a pure frontend component. It makes zero AI calls. It renders static curl snippets for 3 API endpoints (Proof, Repro, Consensus). It uses `PersonaSelector` to let the user switch away. It is self-contained in one file.

**The AI generation pipeline** operates at sub-persona level only. `generate-summary` and `generate-module-content` both receive `sub_persona_id` and use `SUB_PERSONA_REGISTRY[subPersonaId]` to compose prompts. Caching keys are `(paper_id, content_type, persona_id, module_id)` where `persona_id = subPersonaId` (e.g., `'think_tank'`).

**The `generated_content_cache` table** has a plain `text` column for `content_type` (current values: `'summary'`, `'module'`). No migration needed for new content types — just use `'persona_view'`.

`**parentPersona**` is already defined on every `SubPersonaDefinition` in both `src/types/modules.ts` (frontend) and `supabase/functions/_shared/sub-personas.ts` (backend). It is used nowhere in dispatch logic yet — only in `PersonaSelector` for grouping.

`**MODULE_ORDER_BY_PERSONA**` in `constants.ts` and `moduleOrder` state in `PaperViewPage` already encode module priority per sub-persona. These are used by `ModuleAccordionList` to render modules in the right order.

`**PERSONA_CONTENT_MODALITIES**` in `constants.ts` already defines the intended content modalities per parent persona (`'Policy Maker': ['executive_briefs', 'infographics', 'short_videos', 'decision_matrices', 'context_snapshots']`) but is currently unused.

---

## Module Contribution Matrix (Derived from Existing `MODULE_ORDER_BY_PERSONA`)


| Module                   | think_tank order | gov_institution order | Interpretation for Policy Maker          |
| ------------------------ | ---------------- | --------------------- | ---------------------------------------- |
| M1 Contribution & Impact | 1 (Primary)      | 1 (Primary)           | Always first — core finding lens         |
| M5 Call to Actions       | 2 (Primary)      | 2 (Primary)           | Always second — the "so what" for policy |
| M2 Claim & Evidence      | 3 (Secondary)    | 4 (Supporting)        | Evidence quality assessment              |
| M6 SciComms              | 4 (Supporting)   | 3 (Supporting)        | Plain-language communication             |
| M3 Method & Protocol     | 5 (Low)          | 6 (Minimal)           | Just credibility check                   |
| M4 Negative Results      | 6 (Minimal)      | 5 (Low)               | Evidence gaps only                       |


This matrix is already implicitly encoded. The plan formalizes it in a `PARENT_PERSONA_MAP` and a config registry, but does not invent new data.

---

## The Problem With the Previous Plan

The previous plan proposed a `generate-persona-view` edge function that re-fetches RAG chunks and calls GPT-4o to synthesize M1+M2+M5 content. This creates:

- Redundant RAG calls (M1, M2, M5 are already separately cached per sub-persona)
- A parallel, competing generation pipeline alongside the existing one
- A new cache key structure that diverges from the established `(paper_id, content_type, persona_id, module_id)` pattern

The correct architecture reuses the existing generation pipeline. The Policy Maker view calls the existing `generate-module-content` and `generate-summary` edge functions for the relevant modules (M1, M2, M5) with the active `subPersonaId` — exactly as the Researcher view does. What changes is only how that content is laid out and presented.

The only genuinely new AI call needed is the **policy tagging / liquefaction** step that synthesizes cross-module outputs into policy-specific metadata (tags, policy contexts, brief text). This is one new edge function: `generate-policy-view`, which runs after M1+M2+M5 content is available in cache, consuming their cached JSON as input — making zero additional RAG calls.

---

## Revised Architecture: 3-Layer Clean Separation

```text
Layer 1 — CONFIG (no new AI calls, no new DB)
  _shared/parent-personas.ts     new: ParentPersonaConfig registry
  src/lib/constants.ts           add: PARENT_PERSONA_MAP

Layer 2 — GENERATION (one new edge function, reuses existing cache)
  generate-policy-view/          new: reads M1+M2+M5 from generated_content_cache,
                                      calls GPT-4o once for policy liquefaction,
                                      caches as content_type='policy_view'
  generate-module-content/       unchanged
  generate-summary/              unchanged

Layer 3 — DISPATCH + VIEW (frontend only)
  PaperViewPage.tsx              modify: replace binary if/else with parentPersona switch
  views/ResearcherView.tsx       new: extract current else-branch (zero behavior change)
  views/PolicyMakerView.tsx      new: Policy Maker dashboard
  Sub-components of PolicyMakerView (see below)
```

---

## Detailed Implementation

### Step 1 — Config: `supabase/functions/_shared/parent-personas.ts` (new)

This mirrors how `sub-personas.ts` drives sub-persona behavior, but at the parent level. It defines what the `generate-policy-view` function does per parent persona.

```typescript
export interface ParentPersonaConfig {
  id: string;
  visualizationType: 'researcher_modules' | 'policy_dashboard' | 'roi_dashboard' | 'tech_scouting' | 'api_console';
  primaryModules: string[];      // Modules to fetch + display prominently
  secondaryModules: string[];    // Modules to fetch + display collapsed
  liquefactionInputModules: string[];  // Which cached modules feed the policy-view generation
  liquefactionPrompt: (paper: { title: string; abstract: string }, modulesContent: Record<string, unknown>) => string;
}

export const PARENT_PERSONA_REGISTRY: Record<string, ParentPersonaConfig> = {
  'Researcher': {
    visualizationType: 'researcher_modules',
    primaryModules: ['M1', 'M2', 'M3'],
    secondaryModules: ['M4', 'M5', 'M6'],
    liquefactionInputModules: [],
    liquefactionPrompt: () => '',
  },
  'Policy Maker': {
    visualizationType: 'policy_dashboard',
    primaryModules: ['M1', 'M5'],
    secondaryModules: ['M2', 'M6'],
    liquefactionInputModules: ['M1', 'M2', 'M5'],
    liquefactionPrompt: (paper, content) => `... policy tagging prompt using paper + content ...`,
  },
  'AI Agent': {
    visualizationType: 'api_console',
    primaryModules: [],
    secondaryModules: [],
    liquefactionInputModules: [],
    liquefactionPrompt: () => '',
  },
  // Funding Agency and Industry R&D stubs — added in future phases
};
```

The `liquefactionPrompt` function takes the paper metadata and the already-generated module JSON objects as inputs. This means the new edge function never re-runs RAG — it composes a prompt from cached AI outputs.

### Step 2 — Frontend config: `src/lib/constants.ts` (modify)

Add:

```typescript
export const PARENT_PERSONA_MAP: Record<SubPersonaId, string> = {
  phd_postdoc: 'Researcher',
  pi_tenure: 'Researcher',
  think_tank: 'Policy Maker',
  gov_institution: 'Policy Maker',
  funder_governmental: 'Funding Agency',
  funder_private: 'Funding Agency',
  industry_rd: 'Industry R&D',
  ai_agent: 'AI Agent',
};
```

This is a pure lookup — no logic, no coupling. Derived from the existing `parentPersona` field that already exists in `SUB_PERSONA_REGISTRY`.

### Step 3 — New edge function: `generate-policy-view`

**What it does:**

1. Accepts `{ paper_id, sub_persona_id }` (same signature pattern as existing functions)
2. Derives `parent_persona` = `SUB_PERSONA_REGISTRY[sub_persona_id].parentPersona`
3. Checks cache: `generated_content_cache` where `content_type = 'policy_view'` and `persona_id = sub_persona_id`
4. If cached → return immediately
5. Fetches already-cached M1, M2, M5 content from `generated_content_cache` for this `sub_persona_id`
6. If any module not yet cached → triggers `generate-module-content` inline (same pattern as the orchestrator)
7. Fetches paper metadata (`title`, `abstract`) from `papers` table — no RAG call needed
8. Looks up `PARENT_PERSONA_REGISTRY[parent_persona].liquefactionPrompt(paper, {M1, M2, M5})`
9. Calls GPT-4o once with the composed prompt
10. Returns + caches a `PolicyViewPayload`

`**PolicyViewPayload` shape (what the frontend consumes):**

```json
{
  "executive_strip": {
    "relevance_score": 8,
    "relevance_reasoning": "Direct quantitative evidence for EU environmental targets",
    "confidence_level": "high",
    "top_finding": "One-sentence bottom line for a policy maker"
  },
  "policy_tags": {
    "policy_areas": ["climate", "energy policy", "regulation"],
    "policy_relevance_score": 8,
    "policy_relevance_reasoning": "...",
    "suggested_policy_contexts": [
      { "context": "EU Green Deal", "relevance": "Direct evidence for carbon targets" },
      { "context": "IRA (US)", "relevance": "Supports clean energy transition provisions" }
    ]
  },
  "policy_brief": {
    "evidence_quality": "Strong",
    "key_claims_summary": ["Claim A in policy terms", "Claim B in policy terms"],
    "recommended_actions": ["Action 1 for policy makers", "Action 2"],
    "full_brief_text": "Multi-paragraph policy brief..."
  },
  "infographic_spec": {
    "title": "...",
    "sections": ["Finding 1", "Finding 2"],
    "key_visual_description": "Description for image generation prompt"
  }
}
```

**Extensibility:** For Funding Agency, the same function receives `parent_persona = 'Funding Agency'`, looks up a different `liquefactionPrompt` from the registry, and returns an `ROIDashboardPayload`. No structural change to the edge function.

**Cache key used:**

- `content_type = 'policy_view'`
- `persona_id = subPersonaId` (e.g., `'think_tank'`) — consistent with existing pattern
- `module_id = null`

### Step 4 — New frontend hook: `src/hooks/usePolicyView.ts`

Mirrors the pattern of `PersonalizedSummaryCard`'s inline fetch. Calls `generate-policy-view` edge function, manages loading/error/cache state. Returns `PolicyViewPayload | null`.

### Step 5 — Dispatch refactor: `src/pages/PaperViewPage.tsx` (modify)

Replace lines 254–296 (the binary `if/else` block) with:

```typescript
const parentPersona = PARENT_PERSONA_MAP[subPersonaId];

const renderMainContent = () => {
  switch (parentPersona) {
    case 'AI Agent':
      return <AiAgentConsole paperId={numericId} subPersonaId={subPersonaId} onPersonaChange={handlePersonaChange} allowedPersonas={allowedPersonas} />;
    case 'Policy Maker':
      return <PolicyMakerView paperId={numericId} subPersonaId={subPersonaId} paper={paper} structured={structured} storagePath={storagePath} onPersonaChange={handlePersonaChange} allowedPersonas={allowedPersonas} moduleOrder={moduleOrder} />;
    default: // 'Researcher', 'Funding Agency' (fallback), 'Industry R&D' (fallback)
      return <ResearcherView ... />;
  }
};
```

`AiAgentConsole` is not touched at all. `ResearcherView` is a pure extraction of the existing else-branch — zero behavior change.

### Step 6 — Extract: `src/components/paper-view/views/ResearcherView.tsx` (new)

Move the current else-branch content (PersonalizedSummaryCard + ModuleAccordionList + FiguresSection) into this component. Props are identical to what PaperViewPage already passes. This is a refactor, not a rewrite — no behavior changes.

### Step 7 — New: `src/components/paper-view/views/PolicyMakerView.tsx`

The root Policy Maker view component. Calls `usePolicyView(paperId, subPersonaId)` to get `PolicyViewPayload`. While loading, shows a skeleton. Once loaded, renders:

```text
<PersonaSelector />                    ← already exists, reused as-is
<EvidenceDashboardStrip />             ← new sub-component
<PolicyTagsRow />                      ← new sub-component
<div className="grid grid-cols-2">
  <PolicyBriefCard />                  ← new sub-component
  <InfographicPanel />                 ← new sub-component
</div>
<PolicyContentMatcher />               ← new sub-component
```

**Sub-components:**

`**EvidenceDashboardStrip**` — full-width strip card. Shows:

- Confidence meter: a CSS progress bar styled with teal color, labeled "Confidence: High/Medium/Low", driven by `executive_strip.confidence_level`
- Relevance score number `8/10` with color coding (green ≥7, amber 4-6, red ≤3)
- Top finding text: `executive_strip.top_finding` — one bold sentence

`**PolicyTagsRow**` — horizontal scrollable chip row. Each chip shows a policy area tag from `policy_tags.policy_areas`. Clicking a chip opens a `Popover` (existing component) showing the `suggested_policy_contexts` entry for that area. The policy relevance score is shown as `Policy Relevance: 8/10` at the right end of the row.

`**PolicyBriefCard**` — a `Card` component showing:

- Paper title (large, bold) — from props (already available in PaperViewPage)
- Policy relevance tags row (same chips, compact)
- Relevance score: `8/10` with a visual bar
- Evidence quality badge: `Strong` / `Moderate` / `Preliminary` — a colored `Badge` (existing component)
- Publication date + journal — from props
- "Open Full Brief →" button: opens a `Dialog` (existing component) showing:
  - `policy_brief.evidence_quality` badge
  - `policy_brief.key_claims_summary` as a bullet list
  - `policy_brief.recommended_actions` as an action list
  - `policy_brief.full_brief_text` as formatted text

`**InfographicPanel**` — a `Card` showing:

- `infographic_spec.title` + `sections` as structured text preview
- "Generate Infographic" button that triggers `generate-policy-infographic` edge function (separate, on-demand)
- Result: shows generated image URL or loading skeleton
- This is lazy — no image is generated until the user clicks

`**PolicyContentMatcher**` — a `Card` showing:

- Section title: "Policy Context Fit"
- `suggested_policy_contexts` rendered as clickable cards with `context` + `relevance` fields
- Textarea + "Check AI Fit" button: user pastes their own policy draft text → calls `match-policy-content` edge function → shows fit score + relevant paper excerpts inline
- This is entirely self-contained in the component using local state

### Step 8 — On-demand edge functions

`**generate-policy-infographic**` (new, minimal):

- Accepts `{ infographic_spec, paper_title }`
- Composes an image generation prompt from the spec
- Calls DALL-E 3 via OpenAI images API
- Returns `{ image_url: string }` — not cached (on-demand per user session)

`**match-policy-content**` (new):

- Accepts `{ paper_id, sub_persona_id, policy_draft_text }`
- Fetches M1+M2+M5 cached content from `generated_content_cache`
- Calls GPT-4o to assess fit between draft and paper
- Returns `{ fit_score: 1-10, relevant_sections: string[], suggested_citation: string }`
- Not cached (user-specific draft text)

---

## What Is Not Changed


| Component                                      | Status    | Reason                                                           |
| ---------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `generate-module-content`                      | Unchanged | Policy Maker view calls it for M1/M2/M5 via existing API         |
| `generate-summary`                             | Unchanged | Not used in Policy Maker view (replaced by evidence strip)       |
| `AiAgentConsole`                               | Unchanged | Already handled by the ai_agent case in the switch               |
| `PersonaSelector`                              | Unchanged | Reused inside both ResearcherView and PolicyMakerView            |
| `ModuleAccordionList`                          | Unchanged | Still used by ResearcherView                                     |
| `PersonalizedSummaryCard`                      | Unchanged | Still used by ResearcherView                                     |
| `PaperSidebar`                                 | Unchanged | Persona-agnostic, rendered by PaperViewPage regardless of view   |
| `generated_content_cache` table                | Unchanged | New `content_type='policy_view'` works with existing text column |
| `SUB_PERSONA_REGISTRY` (both files)            | Unchanged | Already has parentPersona; no new fields needed                  |
| `composeModulePrompt` / `composeSummaryPrompt` | Unchanged | Used by existing functions, untouched                            |
| `ModuleContentRenderer`                        | Unchanged | Still used by ResearcherView's ModuleAccordion components        |


---

## Files Changed / Created

**New backend files:**

- `supabase/functions/_shared/parent-personas.ts`
- `supabase/functions/generate-policy-view/index.ts`
- `supabase/functions/generate-policy-infographic/index.ts`
- `supabase/functions/match-policy-content/index.ts`

**New frontend files:**

- `src/hooks/usePolicyView.ts`
- `src/components/paper-view/views/ResearcherView.tsx` (pure extraction)
- `src/components/paper-view/views/PolicyMakerView.tsx`
- `src/components/paper-view/views/EvidenceDashboardStrip.tsx`
- `src/components/paper-view/views/PolicyTagsRow.tsx`
- `src/components/paper-view/views/PolicyBriefCard.tsx`
- `src/components/paper-view/views/InfographicPanel.tsx`
- `src/components/paper-view/views/PolicyContentMatcher.tsx`

**Modified files:**

- `src/pages/PaperViewPage.tsx` — replace if/else with switch, import new views
- `src/lib/constants.ts` — add `PARENT_PERSONA_MAP`
- `src/lib/api.ts` — add `fetchPolicyView()`, `generatePolicyInfographic()`, `matchPolicyContent()`
- `supabase/config.toml` — add `verify_jwt = false` for 3 new edge functions

**No database migrations required.**

---

## Extensibility — How to Add Funding Agency Later

1. Add `'Funding Agency'` entry to `PARENT_PERSONA_REGISTRY` in `parent-personas.ts` with its own `liquefactionPrompt` returning an `ROIDashboardPayload`
2. Create `src/components/paper-view/views/FundingAgencyView.tsx`
3. Add `case 'Funding Agency': return <FundingAgencyView ... />` to the switch in `PaperViewPage`
4. `generate-policy-view` handles it automatically via the registry lookup

Total: 3 file edits, 1 new view file. No edge function changes needed.