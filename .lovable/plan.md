

## Plan: Gemini-Driven Figure Discovery + Reliable PNG Coverage

### Problem Confirmed

Two bugs cause missing/inconsistent figures:

1. **Edge function early-exits when GPT-4o found 0 figures** (line 400-405 of `run-figure-extraction`). If text parsing missed all figures, Gemini never scans the pages.

2. **Prompt only asks Gemini to locate figures already listed by GPT-4o** (line 97: "The paper contains these figures"). Gemini never discovers figures independently.

3. **Client fallback hook only renders pages where GPT-4o reported figures** (line 47 of `useFigureExtraction`: `pageNumbers = [...new Set(figures.map(f => f.page_number || 1))]`). If GPT-4o found 2 figures on pages 3 and 7, only those 2 PNGs get sent — not all 11 pages.

The orchestrator already constructs ALL page paths correctly (line 164), so the server path is fine. The client fallback path is broken.

### Changes

| File | What |
|------|------|
| `supabase/functions/run-figure-extraction/index.ts` | 1. **Remove early exit** when `figures.length === 0` — proceed with Gemini even if text found nothing. 2. **Add Phase 0 DISCOVER instruction** to prompt — Gemini independently scans ALL page images for visual elements before processing the listed figures. 3. **Update merge logic** — after Gemini returns, append any newly discovered figures (not in GPT-4o list) to the figures array with new IDs. |
| `src/hooks/useFigureExtraction.ts` | Fix page selection: instead of only rendering pages from `figures.map(f => f.page_number)`, fetch `papers.num_pages` and render ALL pages. This ensures the client fallback sends complete coverage to Gemini. |

### Key prompt addition

```text
### 0. DISCOVER ALL FIGURES
BEFORE processing the listed figures, independently scan ALL provided page images.
Identify EVERY visual element: charts, graphs, diagrams, microscopy images,
photographs, schematics, maps, gel images, spectra, flowcharts, tables with visual content.

For each visual element found:
- Assign a figure_id following the pattern fig_1, fig_2, fig_3...
- Match to the listed figures below by page number and caption similarity
- If a visual element is NOT in the list below, ADD it as a new discovery
```

### Updated merge logic (pseudo-code)

```text
// Current: only maps over existing GPT-4o figures
const updatedFigures = figures.map(fig => matchGemini(fig));

// New: merge + append discoveries
const matched = new Set();
const updatedFigures = figures.map(fig => {
  const gemini = findMatch(fig);
  if (gemini) matched.add(gemini.figure_id);
  return mergeWithGemini(fig, gemini);
});
// Append Gemini discoveries not matched to any existing figure
for (const result of geminiResults) {
  if (!matched.has(result.figure_id)) {
    updatedFigures.push(buildNewFigure(result));
  }
}
```

### What stays the same
- Orchestrator pipeline flow — unchanged (already sends all page paths)
- PNG rendering in UploadSection — unchanged
- FigureRenderer, FigureCard UI — unchanged
- Gemini `code_execution` + PNG images — unchanged (strict requirement)
- All module generation, persona views, RAG — unchanged

