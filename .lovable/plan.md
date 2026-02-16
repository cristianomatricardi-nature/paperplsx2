

## Better Metrics Visualization for M1 Impact Analysis

### The Problem

The M1 "Impact Analysis" tab renders metrics as tall, full-width stacked cards -- each metric shows VALUE, METRIC, PAGE_REF, COMPARISON as vertical key-value pairs inside bordered containers. This wastes space and makes it hard to scan/compare values at a glance.

This happens because the tab data is structured as `{ metrics: [...], quantitative_highlights: "..." }` (an object, not a direct array), so the `MetricsTable` detection in `renderBlock` never triggers -- it falls through to `GenericFallback` which does recursive key-value rendering.

### The Solution

Two changes:

1. **New `MetricsGrid` component** -- Replace the plain table with a compact, interactive grid of metric cards arranged in a 2-column layout. Each card shows:
   - Metric name (top, small label)
   - Value (large, prominent)
   - Comparison context (subtle text below)
   - Page reference badge
   - Hover tooltip with full details
   - Click to highlight/expand

2. **Fix `renderBlock` in `ModuleContentRenderer`** -- Add logic to detect when M1 tab data is an object with a `metrics` array inside it, and render it using the new `MetricsGrid` plus a narrative block for `quantitative_highlights`.

### Visual Layout

```text
+------------------+  +------------------+
| Phase noise red. |  | Effect size      |
|   -10 dBc/Hz     |  |   d=1.25         |
| vs previous      |  | over benchmarks  |
| p. 5             |  | p. 6             |
+------------------+  +------------------+
+------------------+  +------------------+
| Performance gain |  | Sample size      |
|   15%            |  |   n=30           |
| vs SOTA          |  | devices tested   |
| p. 8             |  | p. 3             |
+------------------+  +------------------+

Quantitative Highlights:
The study reports a phase noise reduction of -10 dBc/Hz...
```

### Interactivity

- **Hover**: Each metric card shows a subtle highlight and the comparison context expands
- **Click**: Expands the card to show full details with a smooth animation
- **Sort toggle**: A small button to sort metrics by value or by page reference
- **Color coding**: Values are tinted based on whether the comparison is positive/negative (green for improvements, neutral for descriptive)

### Technical Details

#### File 1: `src/components/paper-view/renderers/MetricsGrid.tsx` (new)

A new component that receives `MetricRow[]` and renders them as a responsive 2-column grid of compact cards. Each card uses:
- `Card` from ui/card for consistent styling
- Tooltip for comparison details on hover
- Collapsible for click-to-expand behavior
- Color logic: parse comparison text for positive signals ("improvement", "reduction", "gain", numbers with + or -)

Props: `{ rows: MetricRow[], quantitativeHighlights?: string }`

#### File 2: `src/components/paper-view/ModuleContentRenderer.tsx`

Update `renderBlock` to detect M1 tab data that is an object containing a `metrics` array:

```typescript
// M1 impact analysis object with metrics array inside
if (moduleId === 'M1' && typeof data === 'object' && !Array.isArray(data) && data !== null) {
  const obj = data as Record<string, unknown>;
  if ('metrics' in obj && Array.isArray(obj.metrics)) {
    return (
      <MetricsGrid
        rows={obj.metrics}
        quantitativeHighlights={typeof obj.quantitative_highlights === 'string' ? obj.quantitative_highlights : undefined}
      />
    );
  }
}
```

This check is added **before** the existing array checks so it catches the nested structure. The existing `MetricsTable` path for direct arrays still works as a fallback.

#### File 3: `src/components/paper-view/renderers/MetricsTable.tsx` (keep as-is)

No changes -- this remains as a fallback for direct metric arrays that may come from other contexts.

### Files Summary

| File | Change |
|------|--------|
| `src/components/paper-view/renderers/MetricsGrid.tsx` | New interactive 2-column metric cards component |
| `src/components/paper-view/ModuleContentRenderer.tsx` | Add M1 object-with-metrics detection before fallback |
