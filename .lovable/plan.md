

## Analytical Pipeline: Fork and Compare Tool

### Overview

Replace the "Community Engagement" sidebar card with an "Analytical Pipeline" card containing a drag-and-drop zone (identical pattern to Replication Cart). Dropped items are persisted via sessionStorage and carried to a new dedicated page at `/analysis/:paperId` where users can explore the paper's analytical decisions as a step-by-step pipeline, map variables to their own dataset, and run "what-if" sensitivity explorations.

### What Changes

**1. Sidebar: Replace Community Engagement with Analytical Pipeline**

File: `src/components/paper-view/PaperSidebar.tsx`

- Remove the entire "Community Engagement" collapsible card (lines 226-256)
- Replace with a new "Analytical Pipeline" card containing:
  - A new `AnalyticalPipelineCart` drop zone component (same pattern as `ReplicationCart`)
  - Brief description: "Drop a claim or method to decompose its analytical decisions"
  - "Open Analytical Pipeline" button that persists cart to sessionStorage and navigates to `/analysis/:paperId`
- Update the collapsed sidebar label from "Community" to "Pipeline"
- Update the `SectionKey` type from `'community'` to `'pipeline'`

**2. New Component: `src/components/paper-view/AnalyticalPipelineCart.tsx`**

- Nearly identical structure to `ReplicationCart.tsx` but with different icon (GitFork or Workflow), label ("Pipeline Cart"), and placeholder text ("Drop claims, methods, or figures to decompose their analytical pipeline")
- Same drag-and-drop handling, same `ReplicationCartItem` type reuse
- Different color theming (indigo/purple tones to distinguish from Replication's green/teal)

**3. New Page: `src/pages/AnalyticalPipelinePage.tsx`**

Route: `/analysis/:paperId`

Layout (top to bottom):
- **Header**: Back button, title "Analytical Pipeline", paper name, action buttons (Export, AI Decompose)
- **Pipeline Flow Panel**: Vertical step-by-step view rendered from AI decomposition
- **Variable Mapping Panel**: Two-column table for aligning paper variables to user's own
- **What-If Sandbox**: Toggle cards for each decision point showing AI-generated sensitivity commentary

On mount:
- Read cart items from `sessionStorage` key `analysis-cart-${paperId}`
- Auto-trigger AI decomposition if items present

**4. New Edge Function: `supabase/functions/decompose-pipeline/index.ts`**

Input: Array of dropped items (claims, methods, figures with their data)

Processing: Calls Lovable AI (gemini-2.5-flash) with a structured prompt to:
- Extract the analytical pipeline as ordered steps (data source, cleaning/exclusions, variable definitions, transformations, statistical model, outputs)
- For each step, identify the author's choice and 2-3 alternative approaches
- Extract all variables mentioned with their roles (independent, dependent, covariate, confounder)
- Generate sensitivity notes for each decision point ("If you changed X to Y, expect...")

Output JSON structure:
```text
{
  pipeline_steps: [
    {
      id, stage (data|cleaning|transform|model|output),
      title, description,
      author_choice, alternatives: string[],
      variables_involved: string[],
      sensitivity_note: string
    }
  ],
  variables: [
    { name, role, description, paper_definition }
  ],
  overall_summary: string
}
```

**5. Pipeline Visualization Components**

New directory: `src/components/analytical-pipeline/`

- `PipelineFlowView.tsx`: Vertical flow of connected cards showing data to output, with colored stage indicators and connector lines between steps
- `DecisionPointCard.tsx`: Individual pipeline step card showing author's choice highlighted, alternatives as muted options, and a toggle to "switch" choices for what-if analysis
- `VariableMappingTable.tsx`: Two-column editable table -- left column shows paper variables (pre-filled from AI), right column has inputs for user's variable names. Includes role badges (IV, DV, covariate)
- `SensitivityPanel.tsx`: When a user toggles a decision point, shows AI-generated commentary about expected impact on results. Uses a collapsible card with before/after framing

**6. Route Registration**

File: `src/App.tsx`

- Add route: `<Route path="/analysis/:paperId" element={<ProtectedRoute><AnalyticalPipelinePage /></ProtectedRoute>} />`

**7. State in PaperViewPage**

File: `src/pages/PaperViewPage.tsx`

- Add `pipelineCartItems` state (separate from `cartItems` for replication)
- Pass to `PaperSidebar` as new props `pipelineCartItems` and `onPipelineCartUpdate`

### Page Layout

```text
+--------------------------------------------------+
| <- Back   Analytical Pipeline   [Export] [AI Run] |
| Paper: "Waveguide analysis..."                    |
+--------------------------------------------------+
|                                                    |
|  PIPELINE FLOW                                     |
|  +------------+                                    |
|  | DATA       | Raw proteomics dataset (n=342)     |
|  | source     | Choice: public GEO repository      |
|  +-----+------+                                    |
|        |                                           |
|  +-----v------+                                    |
|  | CLEANING   | Exclude samples with >20% missing  |
|  |            | [x] Author's choice  [ ] Alt: 10%  |
|  +-----+------+                                    |
|        |                                           |
|  +-----v------+                                    |
|  | TRANSFORM  | Log2 normalization                  |
|  |            | [x] Log2  [ ] Quantile  [ ] VSN    |
|  +-----+------+                                    |
|        |                                           |
|  +-----v------+                                    |
|  | MODEL      | Logistic regression + covariates   |
|  |            | Covariates: age, sex, BMI           |
|  +-----+------+                                    |
|        |                                           |
|  +-----v------+                                    |
|  | OUTPUT     | OR = 2.3, p < 0.01                 |
|  +------------+                                    |
|                                                    |
|  VARIABLE MAPPING                                  |
|  Paper Variable    | Your Variable                 |
|  BMI               | [body_mass_index         ]    |
|  age               | [participant_age         ]    |
|  protein_X         | [biomarker_alpha         ]    |
|                                                    |
|  WHAT-IF SANDBOX                                   |
|  > Remove covariate "BMI"                          |
|    "Removing BMI as a covariate would likely       |
|     increase the effect size by ~15% as BMI        |
|     partially mediates the relationship..."        |
|                                                    |
+--------------------------------------------------+
```

### Sidebar Layout After Change

```text
+----------------------------------+
| Replication Assistant            |
| [Replication Cart drop zone]     |
| [Open Replication Assistant]     |
+----------------------------------+
| Analytical Pipeline              |
| [Pipeline Cart drop zone]        |
| [Open Analytical Pipeline]       |
+----------------------------------+
| Multidimensional Assessment      |
| [Radar chart + scores]           |
+----------------------------------+
```

### Technical Summary

| File | Action |
|------|--------|
| `src/components/paper-view/PaperSidebar.tsx` | Replace Community Engagement with Analytical Pipeline card |
| `src/components/paper-view/AnalyticalPipelineCart.tsx` | New -- drop zone component for pipeline items |
| `src/pages/AnalyticalPipelinePage.tsx` | New -- full pipeline analysis page |
| `src/pages/PaperViewPage.tsx` | Add pipelineCartItems state, pass to sidebar |
| `src/App.tsx` | Add `/analysis/:paperId` route |
| `supabase/functions/decompose-pipeline/index.ts` | New -- AI decomposition edge function |
| `src/components/analytical-pipeline/PipelineFlowView.tsx` | New -- vertical pipeline visualization |
| `src/components/analytical-pipeline/DecisionPointCard.tsx` | New -- individual step card with toggles |
| `src/components/analytical-pipeline/VariableMappingTable.tsx` | New -- variable alignment table |
| `src/components/analytical-pipeline/SensitivityPanel.tsx` | New -- what-if commentary display |

No database changes required. One new edge function using Lovable AI (no API key needed).

