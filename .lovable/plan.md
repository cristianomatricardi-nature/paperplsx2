
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

## Enhanced Figure Extraction: Coordinates-Only + PNG Cropping (IMPLEMENTED)

### Problem
Previous pipeline asked Gemini code_execution to return base64 cropped images inside JSON. Large payloads caused truncated responses, 503/429 errors, and zero images extracted.

### Solution: code_execution for coordinates, client-side canvas crop from PNG

1. Edge function keeps `code_execution` for precise bounding box detection via PIL
2. Gemini returns **only normalized coordinates (0-1)** and enriched metadata — no base64 images
3. Client loads page PNGs from public `paper-figures` bucket and crops via canvas
4. Prompt enhanced to scan paper sections for figure references and build contextual analysis

### Changes

| File | Status |
|------|--------|
| `supabase/functions/run-figure-extraction/index.ts` | ✅ Rewrite: coordinates-only response, contextual analysis prompt, removed all base64/upload logic |
| `src/types/structured-paper.ts` | ✅ Added `page_image_id` to `bounding_box`, `contextual_analysis` to `Figure`, `explanation` + `bounding_box` to `FigureSubPanel` |
| `src/components/paper/FigureRenderer.tsx` | ✅ Rewrite: loads PNG from public bucket URL, crops via canvas, no pdf.js dependency |
| `src/components/paper-view/FigureCard.tsx` | ✅ Updated props: `paperId` instead of `storagePath`, shows `contextual_analysis` in modal |
| `src/components/paper-view/FiguresSection.tsx` | ✅ Updated props: `paperId` instead of `storagePath` |
| `src/components/paper-view/views/ResearcherView.tsx` | ✅ Pass `paperId` to FiguresSection |
| `src/pages/PublicPaperViewPage.tsx` | ✅ Pass `paperId` to FiguresSection |
| `src/hooks/useFigureExtraction.ts` | ✅ Check `figures_extracted` instead of `images_uploaded`, skip figures with existing `bounding_box` |

## Gemini-Driven Figure Discovery (IMPLEMENTED)

### Problem
GPT-4o text structuring misses figures when captions aren't easily parsable from PDF text. The figure extraction edge function only processed figures already listed by GPT-4o, and early-exited when the list was empty.

### Solution: Gemini becomes the authoritative source for figure discovery

1. **Removed early exit** — extraction now proceeds even if GPT-4o found 0 figures
2. **Phase 0 DISCOVER** — Gemini independently scans ALL page PNGs for visual elements before matching to the text-extracted list
3. **Append-only merge** — newly discovered figures are appended to the figures array with proper metadata
4. **Full page coverage** — client hook now renders ALL pages (from `papers.num_pages`) instead of only figure-referenced pages

### Changes

| File | Status |
|------|--------|
| `supabase/functions/run-figure-extraction/index.ts` | ✅ Phase 0 discovery prompt, removed early exit, append-only merge for new discoveries |
| `src/hooks/useFigureExtraction.ts` | ✅ Fetches `num_pages` from papers table, renders ALL pages as PNGs, triggers even when figures array is empty |
