

## Restore Tabs UI with Introduction Tab

### What changes

Each module's content panel will switch from stacked section cards to a **tabbed interface**. The first tab is always **"Introduction"** -- a short context bridge explaining what the paper is about and what this module focuses on. The remaining tabs contain the module-specific content (e.g., Overview, Impact Analysis, Claims, etc.).

### How it works

```text
+-- Module Accordion (expanded) -------------------------+
|                                                         |
|  [ Introduction ]  [ Overview ]  [ Impact Analysis ]    |
|  ~~~~~~~~~~~~~~~                                        |
|                                                         |
|  This paper addresses X problem in the field of Y.     |
|  This module focuses on the paper's core contribution   |
|  and quantitative impact...                             |
|                                                         |
|  What you'll find in other modules:                     |
|  - Claims module: detailed evidence assessment          |
|  - Methods module: step-by-step protocols               |
+---------------------------------------------------------+
```

Clicking another tab (e.g., "Overview") shows the corresponding section card content, same renderers as today (OverviewBlock, MetricsGrid, ClaimCard carousel, etc.).

### Technical details

**1. Update edge function prompts (`supabase/functions/generate-module-content/index.ts`)**

Add an `introduction` key to the `tabs` JSON structure in every module prompt (M1-M6). This field contains:
- `context_bridge`: 2-3 sentences about what the paper is about and why it matters
- `module_focus`: 1-2 sentences about what this specific module covers
- `cross_references`: brief pointers to what other modules cover

Move the Context Bridge content from being embedded in existing sections (e.g., `overview.context`) into this dedicated `introduction` object.

Example for M1:
```json
{
  "tabs": {
    "introduction": {
      "context_bridge": "This paper addresses...",
      "module_focus": "This module analyzes the paper's core contribution and quantitative impact.",
      "cross_references": "For detailed evidence assessment, see the Claims module. For step-by-step methods, see the Methods module."
    },
    "overview": { ... },
    "impact_analysis": { ... },
    "prior_work_comparison": { ... }
  }
}
```

**2. Refactor `ModuleContentRenderer.tsx`**

- Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- When `sections` (from `content.tabs`) exist:
  - Extract the `introduction` key separately
  - Build a tabbed UI with "Introduction" as the default active tab
  - Each remaining section key becomes a tab trigger + tab content panel
  - Tab content panels use the same `renderBlock()` function and card styling as today
- Create a new `IntroductionTab` renderer that displays:
  - Context bridge text as a lead paragraph
  - Module focus as a secondary paragraph
  - Cross-references as a subtle footer with muted text

**3. Update `SECTION_DESCRIPTIONS`**

Add an entry for the introduction tab for each module (e.g., `'M1:introduction': 'What this paper is about and what this module covers.'`).

**4. Clear the content cache**

Delete all cached module content so every module regenerates with the new `introduction` field:
```sql
DELETE FROM generated_content_cache WHERE content_type = 'module'
```

**5. Deploy edge function**

Re-deploy `generate-module-content` with the updated prompts.

### Files modified

| File | Change |
|------|--------|
| `supabase/functions/generate-module-content/index.ts` | Add `introduction` object to all 6 MODULE_PROMPTS JSON schemas |
| `src/components/paper-view/ModuleContentRenderer.tsx` | Replace stacked cards with Radix Tabs UI; add IntroductionTab renderer |
| Database | Clear `generated_content_cache` for modules |

### What stays the same
- All specialized renderers (ClaimCard, ProtocolStep, MetricsGrid, etc.)
- The accordion wrapper (ModuleAccordion)
- The persona selector and module ordering
- The Tabs UI component (already installed via Radix)
