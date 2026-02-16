## Enhanced Persona Registry + Dynamic Prompt Composition

### How Content Is Currently Generated (the full pipeline)

The module content extraction works like this:

1. **Frontend** sends `{ paper_id, module_id, sub_persona_id }` to the edge function
2. **Edge function** embeds a module-specific search query (`MODULE_QUERIES[moduleId]`) -- e.g., "claims, evidence, findings, statistical results" for M2
3. **RAG retrieval**: Matches paper chunks via vector similarity (`match_chunks` RPC) with multi-tier fallback (0.5 / 0.2 / 0.05 threshold)
4. **Prompt assembly**: Combines three layers:
  - `buildPersonaBlock()` -- generic 6-line reader profile from registry
  - Paper context -- the retrieved chunks with page numbers
  - `MODULE_PROMPTS[moduleId]` -- the JSON schema instructions (M1-M6)
5. **GPT-4o** generates JSON matching the schema
6. **Frontend** renders the JSON via `ModuleContentRenderer` which expects a `{ tabs: {...} }` structure

The same pattern applies for summaries (using `generate-summary` with GPT-4o-mini).

### What Changes and What Stays

**Stays the same (no changes needed):**

- `MODULE_QUERIES` -- the embedding search queries (these find the right chunks, persona-independent)
- `MODULE_PROMPTS` -- the JSON schema instructions (these define the output format)
- Frontend types, components, API calls -- all unchanged
- The `{ tabs: {...} }` JSON output structure

**Changes:**

- Backend `SubPersona` interface gets new structured fields
- `buildPersonaBlock()` is replaced by `composeModulePrompt()` and `composeSummaryPrompt()`
- The 42 prompt texts become `moduleInstructions` entries in the registry

### Compatibility Verification

The backend and frontend registries are **completely independent**:


| What        | Backend (`_shared/sub-personas.ts`)                        | Frontend (`src/types/modules.ts`)                           |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Format      | `Record<string, SubPersona>` (object)                      | `SubPersonaDefinition[]` (array)                            |
| Used for    | Prompt generation                                          | UI display, module ordering                                 |
| Fields read | `label`, `painPoint`, `quantitativeDepth`, `languageStyle` | `id`, `parentPersona`, `label`, `shortLabel`, `moduleOrder` |


So we can freely change the backend interface without touching the frontend. The frontend `quantitativeDepth` field exists in the data but is **never read by any component** -- it is purely informational. We can keep it or replace it; no UI will break either way.

### Additional Fine-Tuning Fields Per Persona

Beyond the fields already proposed, here are additional ones that would meaningfully affect output quality:


| Field                     | Purpose                                | Example values                                                                     |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `numberPolicy`            | How to handle raw numbers              | `"all_raw"`, `"explained_raw"`, `"inferred_only"`, `"decision_ready"`              |
| `statisticsDisplay`       | Specific instructions for stats        | "Show every p-value, CI, effect size with plain-language explanation"              |
| `inferredDataPolicy`      | Whether AI can infer beyond paper text | "Never infer" vs "Infer population impact, ALWAYS disclaim as AI-estimated"        |
| `jargonLevel`             | Technical vocabulary control           | `"define_all"`, `"assume_domain"`, `"no_jargon"`, `"business_terms"`               |
| `contentGoal`             | What the reader will DO with this      | "Decide whether to build thesis on this work"                                      |
| `disclaimers`             | Required disclaimers to include        | `["AI-inferred statistics are estimates"]`                                         |
| `citationStyle`           | How to reference sources               | "Page refs only" vs "Include DOIs of cited works"                                  |
| `depthPreference`         | Overall detail level                   | `"exhaustive"`, `"balanced"`, `"executive"`                                        |
| `comparativeFraming`      | What to compare against                | "Prior work in field" vs "Policy baselines" vs "Commercial alternatives"           |
| `educationalExtras`       | Whether to add learning resources      | `true` for PhD students (link textbooks, tutorials)                                |
| `broaderImpactAssessment` | Force honest broader impact check      | `true` for gov/policy -- AI must assess and say "no broader impact" if none exists |


### Updated Plan

#### File 1: `supabase/functions/_shared/sub-personas.ts`

Expand the `SubPersona` interface:

```typescript
export interface SubPersona {
  id: string;
  parentPersona: string;
  label: string;
  painPoint: string;
  // --- NEW STRUCTURED FIELDS ---
  numberPolicy: "all_raw" | "explained_raw" | "narrative_only" | "inferred_only" | "decision_ready";
  statisticsDisplay: string;
  inferredDataPolicy: string;
  jargonLevel: "define_all" | "assume_domain" | "no_jargon" | "business_terms";
  languageStyle: string;
  contentGoal: string;
  depthPreference: "exhaustive" | "balanced" | "executive";
  comparativeFraming: string;
  educationalExtras: boolean;
  broaderImpactAssessment: boolean;
  disclaimers: string[];
  moduleInstructions: Record<string, string>;
}
```

Remove old `quantitativeDepth` (replaced by `numberPolicy` + `statisticsDisplay`).

Each of the 7 persona entries gets populated with all fields. The `moduleInstructions` contain the exact 42 prompt texts you provided, with these adjustments based on your feedback:

- **Government personas**: Module instructions explicitly tell the LLM to assess whether broader/border-level impact exists, and to clearly state when it does not (e.g., "If this research has no direct policy or societal impact at the regional or national level, state that explicitly rather than fabricating relevance.")
- **PhD/Post-doc**: Module instructions emphasize educational materials, learning sources, clear quantitative narrative, and analogies, very detailad numbers and tables for comparison. `educationalExtras: true` triggers the composer to add "Suggest relevant textbooks, tutorials, or review papers where applicable."
- **PI/Tenure**: `depthPreference: "exhaustive"` with `numberPolicy: "all_raw"` -- every statistic, no hand-holding, more high-level.
- **Think Tank / Government**: `broaderImpactAssessment: true` triggers the composer to add "Honestly assess whether this research has broader societal, economic, or policy impact. If not, state clearly: 'This research does not have direct broader impact implications at this time.'"

#### File 2: `supabase/functions/_shared/prompt-composers.ts` (new file)

Two exported functions that read registry data and compose prompts:

`**composeModulePrompt(persona, moduleId, contextText, moduleSchemaPrompt)**`

Assembles in this exact order:

```text
READER PROFILE:
- Role: {label}
- Goal: {contentGoal}
- Numbers: {statisticsDisplay}
- Inferred data: {inferredDataPolicy}
- Language: {languageStyle} / Jargon: {jargonLevel}
- Detail level: {depthPreference}
- Compare against: {comparativeFraming}

MODULE-SPECIFIC ADAPTATION:
{moduleInstructions[moduleId]}

[if educationalExtras] EDUCATIONAL RESOURCES:
Suggest relevant textbooks, tutorials, review papers, or protocol databases where applicable.

[if broaderImpactAssessment] BROADER IMPACT CHECK:
Honestly assess whether this research has broader societal, economic, or policy impact at regional/national level. If not, state clearly: "This research does not have direct broader impact implications at this time." Do not fabricate relevance.

[if disclaimers.length > 0] REQUIRED DISCLAIMERS:
{disclaimers joined by newline}

PAPER CONTEXT (retrieved from the paper):
{contextText}

{moduleSchemaPrompt}
```

`**composeSummaryPrompt(persona, contextText)**`

Same profile block + the existing summary JSON task (the 4-bullet-point schema).

**Input**: Takes `SubPersona` object + strings. No external dependencies.
**Output**: Returns a single string (the full prompt). This is exactly what gets passed to `messages[0].content` in the OpenAI call -- same as today.

#### File 3: `supabase/functions/generate-module-content/index.ts`

Three changes:

1. Add import: `import { composeModulePrompt } from "../_shared/prompt-composers.ts";`
2. Delete `buildPersonaBlock()` function (lines 226-238)
3. Replace prompt assembly (lines 387-394) with:

```typescript
const fullPrompt = composeModulePrompt(subPersona, moduleId, contextText, modulePrompt);
```

Everything else stays identical -- the cache check, RAG retrieval, GPT-4o call, JSON parsing, cache insert, error fallback.

#### File 4: `supabase/functions/generate-summary/index.ts`

Two changes:

1. Add import: `import { composeSummaryPrompt } from "../_shared/prompt-composers.ts";`
2. Replace inline prompt (lines 131-157) with:

```typescript
const prompt = composeSummaryPrompt(subPersona, contextText);
```

#### File 5: `src/types/modules.ts` (frontend, minimal)

Update `SubPersonaDefinition` interface: replace `quantitativeDepth: string` with `numberPolicy: string` and `statisticsDisplay: string`. Update the 7 data entries accordingly. This is purely cosmetic -- no component reads these fields.

#### No other frontend changes needed

The API contract (`{ paper_id, module_id, sub_persona_id }` in, `{ success, content: { tabs: {...} } }` out) does not change. `ModuleContentRenderer`, `PersonalizedSummaryCard`, `PersonaSelector`, `ModuleAccordion`, `api.ts` -- all remain untouched.

### Cache Cleanup

After deploying, clear stale cached content so users get the newly tailored output:

```sql
DELETE FROM generated_content_cache WHERE content_type IN ('module', 'summary');
```

### Files Summary


| File                                                  | Change                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `supabase/functions/_shared/sub-personas.ts`          | Expanded interface, 7 personas with all new fields + 42 `moduleInstructions` |
| `supabase/functions/_shared/prompt-composers.ts`      | New file: `composeModulePrompt` + `composeSummaryPrompt`                     |
| `supabase/functions/generate-module-content/index.ts` | Remove `buildPersonaBlock`, use `composeModulePrompt`                        |
| `supabase/functions/generate-summary/index.ts`        | Use `composeSummaryPrompt`                                                   |
| `src/types/modules.ts`                                | Replace `quantitativeDepth` with `numberPolicy` + `statisticsDisplay`        |
