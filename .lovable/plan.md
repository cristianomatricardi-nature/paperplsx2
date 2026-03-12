
## Dynamic Waveform Audio Player (NotebookLM-style)

(Previous plan — implemented)

## Gemini-Powered Figure Extraction with Citation Mapping (IMPLEMENTED)

### Changes made

| File | Status |
|------|--------|
| `run-figure-extraction/index.ts` | ✅ Full rewrite: pdfjs-serverless page→PNG, Gemini 2.5 Flash vision + code_execution, crop upload, citation mapping |
| `src/types/structured-paper.ts` | ✅ Added `FigureSubPanel`, `FigureCitation`, and new fields on `Figure` |
| `generate-module-content/index.ts` | ✅ Injects figure citations + visual descriptions into prompt |
| `generate-summary/index.ts` | ✅ Includes figure context for inline placement |
| `ModuleContentRenderer.tsx` | ✅ Supports sub-panel tokens `[FIGURE: fig_Xa]` |
| `FigurePlaceholder.tsx` | ✅ Renders sub-panels as grid, shows visual_description |

### Secret added
- `GOOGLE_API_KEY` — Google AI Studio key for native Gemini API

## PDF → PNG → Gemini code_execution Pipeline (IMPLEMENTED)

### Problem
Deno Edge Functions have no OffscreenCanvas and no node-canvas. Gemini code_execution can process PNGs but not PDFs directly.

### Solution: Client-Server Hybrid
1. Client renders PDF pages to PNG via pdf.js (existing `usePaperPdf`)
2. Uploads page PNGs to `paper-figures/{id}/page_{n}.png`
3. Edge function downloads PNGs, sends to Gemini 2.5 Flash with `code_execution`
4. Gemini uses PIL to crop figures, returns base64 PNGs
5. Edge function uploads crops, updates `structured_papers.figures` with `image_url`

### Files changed

| File | Status |
|------|--------|
| `src/hooks/useFigureExtraction.ts` | ✅ New — detects figures without image_url, renders pages to PNG, uploads, calls edge function |
| `supabase/functions/run-figure-extraction/index.ts` | ✅ Rewrite — accepts page_images array, downloads PNGs, Gemini + code_execution, crops + uploads |
| `src/pages/PaperViewPage.tsx` | ✅ Wired useFigureExtraction hook |
| `orchestrate-pipeline` | ✅ Unchanged — fires run-figure-extraction which now defers if no page_images provided |
