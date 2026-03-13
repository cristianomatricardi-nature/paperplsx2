

# Three Improvements: Method Detection, Pre-generated Titles, Collapsed DOI

## 1. Enhanced Method Detection with Author Attribution

**Current state**: The `run-structuring` prompt already extracts individual method steps with `tools`, `reagents`, `conditions`, `depends_on`, etc. But it lacks:
- Grouping methods into logical categories (e.g., "Synthesis", "Characterization", "Analysis")
- Author attribution per method step

**Approach**: Enhance the structuring prompt to extract two new fields per method entry:
- `method_group`: A category label (e.g., "Sample Preparation", "Data Analysis") to group related steps
- `attributed_authors`: Array of author names responsible for this method (extracted from author contribution statements, acknowledgments, or inferred from the methods section)

Then update the M3 `ProtocolFlowView` component to:
- Group steps by `method_group` with section headers
- Show author attribution badges on each step card

**Files**:
- `supabase/functions/run-structuring/index.ts` — Add `method_group` and `attributed_authors` fields to the methods schema in `MASTER_STRUCTURING_PROMPT`
- `src/components/paper-view/renderers/ProtocolFlowView.tsx` — Group steps by `method_group`, show author badges

---

## 2. Pre-generate Module Titles During Pipeline

**Current state**: Module titles are generated on-demand when a user clicks to expand a module. The user wants titles ready immediately when they open Paper++.

**Approach**: Add a new pipeline step in `orchestrate-pipeline` after chunking completes. Create a lightweight `generate-module-titles` edge function that:
- Takes the structured paper data (sections, claims, methods, abstract)
- Generates titles for all 6 modules in a **single AI call** (much cheaper than 6 separate module generations)
- Stores titles in a new column on `structured_papers` table: `module_titles jsonb` (e.g., `{"M1": "CRISPR Efficiency...", "M2": "Evidence for..."}`)
- The frontend reads these titles from `structured_papers` and passes them to `ModuleAccordion` so they're visible before any module content is generated

This avoids generating full module content eagerly (which is expensive) while still providing titles upfront.

**Files**:
- `supabase/functions/generate-module-titles/index.ts` — New lightweight edge function
- `supabase/functions/orchestrate-pipeline/index.ts` — Fire after chunking, poll for completion
- DB migration: Add `module_titles jsonb DEFAULT '{}'` to `structured_papers`
- `src/components/paper-view/ModuleAccordionList.tsx` — Accept and pass pre-generated titles
- `src/components/paper-view/ModuleAccordion.tsx` — Use pre-generated title as primary, override with cached content title if available
- `src/hooks/useRealtimePaper.ts` or the paper view page — fetch `module_titles` from `structured_papers`

---

## 3. DOI Visible When Collapsed

**Current state**: The DOI footer (`10.paper++/55.M1.phd_postdoc`) is inside the collapsible content panel, so it disappears when the module is collapsed.

**Approach**: Move the DOI line outside the collapsible `<div>` so it's always visible at the bottom of the module card, regardless of open/closed state.

**File**: `src/components/paper-view/ModuleAccordion.tsx` — Move DOI `<div>` after the collapsible panel, inside the outer card container.

---

## Summary of Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Method grouping + author attribution in structuring | `run-structuring/index.ts`, `ProtocolFlowView.tsx` |
| 2 | Pre-generate titles during pipeline | New `generate-module-titles/index.ts`, `orchestrate-pipeline/index.ts`, DB migration, `ModuleAccordion.tsx`, `ModuleAccordionList.tsx`, paper view data fetching |
| 3 | DOI always visible | `ModuleAccordion.tsx` |

