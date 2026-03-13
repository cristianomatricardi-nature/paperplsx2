

# Module as Knowledge Object — Title Generation Architecture

## What You Want
Each module (M1–M6) should feel like a standalone **knowledge object** with:
- A **type label** (e.g., "Contribution & Impact Statement") — the current title becomes the category
- A **content-specific title** generated from the actual paper content (e.g., "CRISPR-Cas9 Achieves 94% Editing Efficiency in Human T-Cells")
- A **DOI-like identifier** at the bottom (e.g., `paper++:55/M1/phd_postdoc`)

## Where to Generate Titles

### Best approach: Generate during module content generation (in `generate-module-content`)

The module content generation step already has all the context needed — the RAG chunks, the module prompt, and the AI call. The simplest and most effective approach:

**Add a `module_title` field to the JSON output schema of each module prompt.** For example, the M1 prompt already asks for a JSON with `tabs: { ... }`. We add a top-level `module_title` field:

```text
{
  "module_title": "A concise 8-15 word title summarizing THIS module's content for THIS paper",
  "tabs": { ... }
}
```

This means:
- No extra API call — the title comes back with the content in the same generation
- It's persona-aware (a PhD student gets a different title framing than a policy maker)
- It's cached alongside the content in `generated_content_cache`
- Existing cached content without titles gracefully falls back to the module type name

### Why not during structuring?
Structuring happens before modularization and doesn't know which content maps to which module. The module titles only make sense once the RAG + prompt has produced the module-specific lens.

## Implementation Plan

### 1. Backend — Update module prompts (edge function)
In `generate-module-content/index.ts`, prepend to each `MODULE_PROMPTS[M*]` string:

```text
IMPORTANT: Include a top-level "module_title" field in your JSON response.
This should be a concise (8-15 words) title that captures the specific
content of this module for THIS paper. Not the generic module type —
a title like a journal article section heading.
```

The JSON schema for each module gets `"module_title": "..."` at the top level alongside `"tabs"`.

### 2. Frontend — Update ModuleAccordion header
- Extract `module_title` from `cachedContent` (if present)
- Display the module type (e.g., "Contribution & Impact") as a small colored badge/chip
- Display the `module_title` as the main heading
- Add a DOI-like footer: `paper++:{paperId}/{moduleId}/{persona}`

### 3. Visual design of the module card

```text
┌─────────────────────────────────────────────────┐
│ ┌──────────────────────────┐                  ▼ │
│ │ Contribution & Impact    │  ← type badge      │
│ └──────────────────────────┘                    │
│ CRISPR-Cas9 Achieves 94% Editing               │
│ Efficiency in Human T-Cells    ← content title  │
│                                                 │
│ [expanded content here...]                      │
│                                                 │
│ ─────────────────────────────────────────────── │
│ paper++:55/M1/phd_postdoc          ← DOI line  │
└─────────────────────────────────────────────────┘
```

### 4. Backward compatibility
- If `cachedContent.module_title` is undefined (old cached entries), fall back to the generic `moduleDefinition.title` as the main heading (no badge shown)
- No migration needed — new generations will include titles automatically

### Files to Change
1. **`supabase/functions/generate-module-content/index.ts`** — Add `module_title` instruction to each of the 6 `MODULE_PROMPTS` entries
2. **`src/components/paper-view/ModuleAccordion.tsx`** — Redesign header to show type badge + content title + DOI footer
3. **`src/components/paper-view/ModuleAccordionList.tsx`** — Minor: pass paperId for DOI construction (already passed)

