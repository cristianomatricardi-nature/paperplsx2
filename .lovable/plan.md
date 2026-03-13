

# Fix Module Title Generation

## Root Cause

Two issues prevent titles from appearing:

1. **Cache returns stale content**: Paper 55 has 3 cached modules (M1, M2, M3) — all generated *before* the `module_title` instruction was added. The edge function returns cached content immediately without checking if `module_title` exists, so the AI never gets a chance to generate one.

2. **JSON schema examples lack `module_title`**: The `MODULE_TITLE_INSTRUCTION` text says "include module_title" but the actual JSON examples in each `MODULE_PROMPTS` entry (M1–M6) don't show `module_title` in their structure. GPT-4o follows the JSON schema structure literally — if `module_title` isn't in the example, it won't produce one even with the instruction text.

## Changes

### 1. Edge function — `supabase/functions/generate-module-content/index.ts`

**A. Add `module_title` to every JSON schema example**
In each of the 6 `MODULE_PROMPTS` entries, add `"module_title": "..."` as the first field in the Return JSON example, right before `"tabs"`. For example:
```json
{
  "module_title": "Concise 8-15 word title for THIS module's content",
  "tabs": { ... }
}
```

**B. Auto-regenerate if cached content lacks `module_title`**
After the cache hit check (line 367), add a condition: if the cached content exists but has no `module_title` field, skip the cache and fall through to regeneration. Update the cache row afterward (upsert instead of insert).

**C. Deterministic fallback after AI response**
After parsing the AI JSON (line 540), if `module_title` is still missing, extract a title deterministically — e.g., take the first claim statement, or the `core_contribution` field, truncate to 15 words.

### 2. Frontend — `src/components/paper-view/ModuleAccordion.tsx`

**Fix duplicate title display**: When `contentTitle` is missing (null), hide the Badge entirely and show only the generic module name as the heading. Only show the Badge + contentTitle combo when a real generated title exists.

**Update DOI format**: Change `paper++:{paperId}/{moduleId}/{subPersonaId}` to `10.paper++/{paperId}.{moduleId}.{subPersonaId}` for a realistic mocked DOI.

### Files
| File | Change |
|------|--------|
| `supabase/functions/generate-module-content/index.ts` | Add `module_title` to all 6 JSON schemas, cache-miss on missing title, deterministic fallback |
| `src/components/paper-view/ModuleAccordion.tsx` | Conditional badge display, mocked DOI format |

