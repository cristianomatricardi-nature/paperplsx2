
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
