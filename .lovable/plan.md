

## Redesign Analytical Pipeline Page: Two Focused Boxes

### Overview

Remove the step-by-step Pipeline Flow view entirely. Replace it with two rich, self-contained panels:

1. **Variable Mapping Box** -- enhanced with a mocked scatter plot visualization and a "Upload Your Data" placeholder interface
2. **What-If Sandbox Box** -- redesigned with interactive toggle cards that show mocked scientific charts (bar charts, line charts) generated from manuscript data, updating visually when choices are toggled

Both panels will include a clear beta disclaimer banner: "Beta: These visualizations use mocked data extrapolated from the manuscript. Figure extraction is not yet implemented."

### What Changes

**1. Remove Pipeline Flow from page (`AnalyticalPipelinePage.tsx`)**

- Remove the entire "Pipeline Flow" section (the `PipelineFlowView` component and its heading)
- Remove the import of `PipelineFlowView`
- Keep the `steps` state (still needed for the What-If sandbox decision points)
- Restructure the page into two clear boxes: Variable Mapping and What-If Sandbox
- Add a beta disclaimer banner at the top

**2. Redesign Variable Mapping (`VariableMappingTable.tsx`)**

Enhance the existing table with:
- A **mocked scatter plot** above the table using Recharts (already installed), showing a fake correlation between two paper variables (e.g., "BMI vs Outcome") with labeled axes from the AI-extracted variable names
- A **"Upload Your Dataset" placeholder** card below the table with a dashed-border drop zone, file icon, and text: "Upload a CSV to auto-map columns (coming soon)" -- disabled/mocked
- A beta info badge: "Mocked visualization -- figure extraction not available in beta"

**3. Redesign What-If Sandbox (`SensitivityPanel.tsx`)**

Complete overhaul:
- Instead of just text collapsibles, each decision point gets a **mocked chart** (using Recharts):
  - Bar chart showing "Author's choice" vs "Alternative" with fabricated effect sizes derived from the AI sensitivity notes
  - When user toggles an alternative, the chart animates to highlight the selected choice
- Each card shows:
  - The decision point title and description
  - Radio-style toggles for author choice vs alternatives (reuse from `DecisionPointCard`)
  - A Recharts `BarChart` or `LineChart` with mocked data points
  - The AI sensitivity note text below the chart
- Beta disclaimer per card: "Simulated data for demonstration -- actual figure extraction coming soon"

**4. Remove unused components**

- `PipelineFlowView.tsx` -- no longer rendered (can keep file but remove from imports)
- `DecisionPointCard.tsx` -- the toggle UI will be inlined into the new `SensitivityPanel`

**5. Update edge function prompt (`decompose-pipeline/index.ts`)**

Add to the AI prompt: for each step, also return `mock_effect_size` (a number between 0-1 representing the author's result) and `mock_alt_effect_sizes` (array of numbers for each alternative). This gives us numeric data to render in charts. Also ask for `mock_variable_correlation` data (array of {x, y} pairs) for the variable mapping scatter plot.

Updated tool schema adds:
- `pipeline_steps[].mock_effect_size: number`
- `pipeline_steps[].mock_alt_effect_sizes: number[]`
- `mock_scatter_data: [{x: number, y: number, label: string}]` (top-level, for variable mapping plot)

### Page Layout After Changes

```text
+--------------------------------------------------+
| <- Back   Analytical Pipeline   [Export] [AI Run] |
| Paper: "Waveguide analysis..."                    |
+--------------------------------------------------+
| [!] Beta: Visualizations use mocked data          |
|     extrapolated from the manuscript. Figure       |
|     extraction is not yet implemented.             |
+--------------------------------------------------+
|                                                    |
|  VARIABLE MAPPING                                  |
|  +----------------------------------------------+ |
|  |  [Mocked Scatter Plot: Var1 vs Var2]          | |
|  |  (Recharts ScatterChart with fake data)       | |
|  +----------------------------------------------+ |
|  | Paper Variable    | Your Variable             | |
|  | BMI        [IV]   | [body_mass_index     ]    | |
|  | age        [Cov]  | [participant_age     ]    | |
|  | protein_X  [DV]   | [biomarker_alpha     ]    | |
|  +----------------------------------------------+ |
|  | +------------------------------------------+  | |
|  | | Upload Your Dataset (CSV)    [coming soon]|  | |
|  | | Drag & drop or click to upload           |  | |
|  | +------------------------------------------+  | |
|                                                    |
|  WHAT-IF SANDBOX                                   |
|  +----------------------------------------------+ |
|  | Missing Data Threshold                        | |
|  | (o) >20% exclusion (Author)                   | |
|  | ( ) >10% exclusion                            | |
|  | ( ) >30% exclusion                            | |
|  |                                               | |
|  | [Bar Chart: effect sizes per choice]          | |
|  | Author: 0.72  |  Alt1: 0.58  |  Alt2: 0.81   | |
|  |                                               | |
|  | "Lowering the threshold to 10% would retain   | |
|  |  more noisy samples, likely reducing the       | |
|  |  effect size by ~15%..."                       | |
|  | [Simulated data for demonstration]            | |
|  +----------------------------------------------+ |
|                                                    |
+--------------------------------------------------+
```

### Technical Summary

| File | Action |
|------|--------|
| `src/pages/AnalyticalPipelinePage.tsx` | Remove PipelineFlowView section, add beta banner, restructure into 2 boxes |
| `src/components/analytical-pipeline/VariableMappingTable.tsx` | Add Recharts scatter plot above table, add mocked upload placeholder, add beta badge |
| `src/components/analytical-pipeline/SensitivityPanel.tsx` | Full redesign: inline decision toggles + Recharts bar charts per step + beta disclaimers |
| `supabase/functions/decompose-pipeline/index.ts` | Add mock_effect_size, mock_alt_effect_sizes, mock_scatter_data to AI prompt and tool schema |

No new files needed. No database changes. Uses existing Recharts dependency for charts.

