
## Fix Module Content: Clear Cache + Restore Card Layout

### Problem 1: Paper 11 still shows old content
We cleared the cache for paper 9, but you're viewing paper 11 which still has content generated with the old narrow prompts. The new "Context Bridge / Focal Content / Cross-reference" structure only takes effect when modules regenerate from scratch.

**Fix**: Delete cached content for paper 11 (and optionally all papers) so modules regenerate with the updated prompts.

### Problem 2: Restore card-based visualization
The current layout renders modules as paragraph sections with `ModuleSectionHeader` + flowing text. You want the previous card-based layout back -- where each section appears as a distinct card with borders and structure.

**Fix**: In `ModuleContentRenderer.tsx`, replace the current `<section>` + `ModuleSectionHeader` layout with a card-based layout where each section is wrapped in a bordered card component. The section title and description go inside the card header.

---

### Technical details

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/paper-view/ModuleContentRenderer.tsx` | Replace the `<section className="space-y-3">` + `ModuleSectionHeader` layout with a card wrapper: each section rendered inside a `<div className="rounded-lg border bg-card p-4 shadow-sm">` with the title as a card header |

**Database operation:**
- Clear cache for paper 11: `DELETE FROM generated_content_cache WHERE paper_id = 11 AND content_type = 'module'`
- Optionally clear all papers: `DELETE FROM generated_content_cache WHERE content_type = 'module'`

### What the card layout looks like

```text
+------------------------------------------+
| [accent border]  OVERVIEW                |
| What this paper contributes...           |
|                                          |
| Context paragraph...                     |
| +-- Core Contribution card --+           |
| | The main novel finding...  |           |
| +----------------------------+           |
| Novelty statement in italic...           |
+------------------------------------------+

+------------------------------------------+
| [accent border]  IMPACT ANALYSIS         |
| Quantitative results and their...        |
|                                          |
| [MetricsGrid cards]                      |
+------------------------------------------+
```

Each section becomes a self-contained card rather than a flowing paragraph section. The `ModuleSectionHeader` component stays but is embedded inside the card as its header, and the card itself gets a border, background, and subtle shadow.

### What stays the same
- All specialized renderers (ClaimCard carousel, ProtocolStep, MetricsGrid, etc.)
- The edge function prompts (already updated)
- The `ModuleSectionHeader` component (reused inside cards)
- The `SECTION_DESCRIPTIONS` map
