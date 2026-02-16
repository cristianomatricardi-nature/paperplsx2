

## Restructuring Module Content: From Lists to Self-Contained Knowledge Lenses

### The Problem

Right now, when you open a module, you see raw tabs ("Overview", "Impact Analysis", "Prior Work Comparison") with flat lists of data inside. It reads like a database dump, not like a coherent narrative. Each module should feel like opening a mini-article about the paper, viewed through that module's specific lens.

### The Solution: Narrative Sections with Visual Hierarchy

Instead of tabs (which fragment content and hide information behind clicks), each module will render as a **single scrollable page** with clearly separated narrative sections, each with a headline, a brief intro sentence, and then the structured content beneath it.

```text
+----------------------------------------------+
| M1: Contribution & Impact Statement          |
+----------------------------------------------+
| CONTEXT & SIGNIFICANCE                        |
| Brief intro paragraph setting the scene...    |
|                                               |
| "What makes this paper novel..."              |
|                                               |
+----------------------------------------------+
| KEY METRICS                                   |
| Brief sentence: "The paper reports the        |
| following quantitative results:"              |
|                                               |
|  [metric grid cards as today]                 |
|                                               |
+----------------------------------------------+
| QUANTITATIVE HIGHLIGHTS                       |
| Narrative paragraph summarizing numbers...    |
|                                               |
+----------------------------------------------+
| HOW THIS CHANGES THE FIELD                    |
| Before vs After comparison...                 |
|                                               |
+----------------------------------------------+
```

### Architecture of the Change

**No backend changes needed.** The existing JSON structure from the edge function already has the right data (e.g., M1 returns `tabs.overview`, `tabs.impact_analysis`, `tabs.prior_work_comparison`). The problem is purely in the frontend renderer which blindly maps tab keys to flat content panels.

### What changes

**1. Replace the `Tabs` component with a sectioned layout in `ModuleContentRenderer.tsx`**

Instead of:
```text
Tabs > TabsList > TabsTrigger (per key)
     > TabsContent (per key) > renderBlock()
```

We render:
```text
div.space-y-6 > for each section:
  SectionHeader (title + optional intro)
  renderBlock() (existing specialized renderers)
```

Each section gets a `SectionHeader` component with:
- A thin left accent border (matching the module's tier color)
- A humanized title (e.g., "impact_analysis" becomes "Impact Analysis")
- Module-specific intro sentences defined in a static map

**2. New component: `ModuleSectionHeader`**

A small presentational component:
- Renders a heading with a colored left border
- Optionally shows a brief description line below the heading
- Consistent typography: `text-lg font-semibold` for the title, `text-sm text-muted-foreground` for the description

**3. Module section descriptions map**

A static lookup in `ModuleContentRenderer.tsx` that provides contextual intro sentences for known section keys. For example:

| Module | Section Key | Intro |
|--------|-------------|-------|
| M1 | overview | "What this paper contributes and why it matters." |
| M1 | impact_analysis | "Quantitative results and their significance." |
| M1 | prior_work_comparison | "How this advances beyond previous research." |
| M2 | claims | "Each claim extracted from the paper with its supporting evidence." |
| M2 | evidence_summary | "Overall assessment of the evidence quality." |
| M3 | protocol_steps | "Step-by-step procedures for replicating this work." |
| M3 | analysis_methods | "Statistical and analytical approaches used." |
| M3 | reproducibility | "Assessment of how reproducible this work is." |
| M4 | negative_results | "What was tested but did not work as expected." |
| M4 | limitations | "Acknowledged limitations and caveats." |
| M5 | research_actions | "Concrete next steps recommended by the paper." |
| M6 | plain_language_summary | "The research explained without jargon." |

Any unknown key falls back to the humanized key name with no intro.

**4. Flatten nested "overview" objects for M1**

The M1 `overview` tab returns an object like `{ context, core_contribution, novelty_statement }`. Currently GenericFallback renders this as labeled key-value pairs. We will add a dedicated `OverviewBlock` renderer that presents these three fields as a cohesive intro paragraph/card with:
- `context` as a lead-in paragraph
- `core_contribution` as a highlighted statement (slightly larger text or card)
- `novelty_statement` as an italic follow-up

**5. Evidence Summary card for M2**

The M2 `evidence_summary` object (`{ total_claims, strong, moderate, preliminary, overall_assessment }`) currently renders as generic key-value. We will add a small `EvidenceSummaryCard` component showing:
- A horizontal bar or badge row: "5 claims: 2 strong, 2 moderate, 1 preliminary"
- The `overall_assessment` as a paragraph below

**6. Reproducibility card for M3**

The M3 `reproducibility` object (`{ score, strengths, gaps, pitfalls }`) will get a dedicated `ReproducibilityCard`:
- Score displayed as a progress bar or large number out of 10
- Strengths/gaps/pitfalls as labeled bullet lists

### Files to create/modify

| File | Change |
|------|--------|
| `src/components/paper-view/ModuleContentRenderer.tsx` | Replace Tabs layout with sectioned layout; add section descriptions map |
| `src/components/paper-view/renderers/ModuleSectionHeader.tsx` | New: section heading with accent border and intro text |
| `src/components/paper-view/renderers/OverviewBlock.tsx` | New: M1 overview renderer (context + contribution + novelty) |
| `src/components/paper-view/renderers/EvidenceSummaryCard.tsx` | New: M2 evidence summary with badge counts |
| `src/components/paper-view/renderers/ReproducibilityCard.tsx` | New: M3 reproducibility score and assessment |

### What stays the same

- All existing specialized renderers (ClaimCard, ProtocolStep, MetricsGrid, ActionCard, NegativeResultCard) remain unchanged
- The edge function prompts and JSON structure remain unchanged
- The RAG-powered metric click-to-explain popover stays as-is
- The accordion open/close behavior stays the same

### Result

Opening any module will feel like reading a short, structured article -- not browsing a data table. Each section flows into the next with clear headings and contextual introductions, while still using the rich specialized cards for claims, metrics, and protocols.
