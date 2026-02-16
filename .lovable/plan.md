

## Metric Click-to-Explain with RAG Source Overlay

### What it does

When you click a metric card in the M1 Impact Analysis grid, a small overlay card pops up showing:
- The manuscript passages where that number comes from (retrieved via RAG)
- Page numbers linking back to the source
- A loading spinner while fetching

This gives you instant traceability from any metric back to the original text.

### How it works

```text
User clicks metric card
        |
        v
Edge function "explain-metric"
  1. Embeds: "metric_name value comparison"
  2. Calls match_chunks(paper_id, embedding)
  3. Returns top 3-4 relevant passages with page numbers
        |
        v
Popover overlay shows passages
```

### Changes

**1. New edge function: `supabase/functions/explain-metric/index.ts`**

- Accepts `{ paper_id, query }` where query is a string like "Phase noise reduction -10 dBc/Hz"
- Embeds the query using the same OpenAI embedding model already used elsewhere
- Calls the existing `match_chunks` RPC with a low threshold (0.3) and limit of 4
- Returns the matching chunk content and page numbers -- no LLM call needed, just retrieval

**2. New API function in `src/lib/api.ts`**

- `explainMetric(paperId: number, query: string)` that invokes the new edge function

**3. Update `MetricsGrid.tsx` -- replace Collapsible with Popover**

- Each MetricCard gets a `paperId` prop (passed down from MetricsGrid)
- On click, instead of expanding inline, a Popover opens anchored to the card
- The popover triggers a fetch to `explain-metric` with a query built from the metric name + value + comparison
- Shows a small loading skeleton, then renders 2-4 source passages with page badges
- Layout: compact overlay card (~300px wide) with:
  - Header: "Source in manuscript"
  - Each passage as a quoted block with page reference badge
  - Similarity score shown as a subtle indicator

**4. Update `ModuleContentRenderer.tsx`**

- Pass `paperId` through to MetricsGrid so it can make the RAG call

**5. Update `ModuleAccordion.tsx`**

- Pass `paperId` to ModuleContentRenderer

### Technical details

The explain-metric edge function is lightweight -- it only does embedding + vector search (no LLM generation), so it should respond in under 1 second. It reuses the existing `match_chunks` database function and OpenAI embedding infrastructure.

The Popover replaces the current Collapsible expand behavior. The tooltip on hover is kept for quick comparison preview; the click now opens the richer source overlay.

### Files summary

| File | Change |
|------|--------|
| `supabase/functions/explain-metric/index.ts` | New edge function: embed query, match chunks, return passages |
| `src/lib/api.ts` | New `explainMetric()` function |
| `src/components/paper-view/renderers/MetricsGrid.tsx` | Replace Collapsible with Popover, fetch sources on click |
| `src/components/paper-view/ModuleContentRenderer.tsx` | Pass paperId to MetricsGrid |
| `src/components/paper-view/ModuleAccordion.tsx` | Pass paperId to ModuleContentRenderer |

