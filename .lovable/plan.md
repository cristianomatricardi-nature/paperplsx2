

# Fix: PDF → PNG → Gemini code_execution Pipeline

## The Core Problem

Deno Edge Functions have **no OffscreenCanvas** (the PR is still open in Deno as of March 2026) and **no node-canvas** (native bindings). This means we cannot render PDF pages to PNG images server-side. Meanwhile, Gemini's `code_execution` Python sandbox **can** process images (confirmed for Gemini 3 Flash), but **cannot** process PDFs — it needs PNG input.

## Solution: Client-Side Page Rendering + Server-Side Gemini Cropping

The frontend already has a working pdf.js setup (`usePaperPdf`) that renders PDF pages to canvas. We use this to bridge the gap:

```text
CLIENT (browser)                          SERVER (edge function)
─────────────────                         ─────────────────────
1. Paper loads, figures                   
   have no image_url                      
2. pdf.js renders figure                  
   pages → canvas → PNG blob             
3. Upload page PNGs to                   
   paper-figures/{id}/page_{n}.png       
4. Call run-figure-extraction ──────────→ 5. Download page PNGs from storage
   with { paper_id,                       6. Send PNGs as inline_data (image/png)
     page_images: [...] }                    to Gemini 3 Flash Preview
                                             + code_execution enabled
                                          7. Python/PIL crops each figure
                                             and sub-panels
                                          8. Upload cropped PNGs to storage
                                          9. Update structured_papers with
                                             image_url, visual_description,
                                             sub_panels, citations
                                         10. Return success
← figures now have image_url ────────────
11. FigureCard re-renders with
    real images
```

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useFigureExtraction.ts` | **New** — hook that detects figures without `image_url`, renders their pages to PNG via pdf.js, uploads to storage, and calls the edge function |
| `supabase/functions/run-figure-extraction/index.ts` | **Rewrite** — accepts page image paths, downloads PNGs, sends to Gemini 3 Flash Preview with `code_execution`, uploads crops, updates DB |
| `src/pages/PaperViewPage.tsx` | Add `useFigureExtraction` call to trigger extraction on paper load |
| `supabase/functions/orchestrate-pipeline/index.ts` | Keep the `fireFunction("run-figure-extraction")` call but make it a no-op/flag-setter when no page images are provided (extraction deferred to client) |

## Technical Details

### Client hook (`useFigureExtraction`)
- Reads `structured_papers.figures` — finds figures where `image_url` is null
- Groups figures by `page_number` to avoid rendering the same page twice
- Uses existing `usePaperPdf.renderPage()` to render each unique page at 2x scale
- Converts canvas to PNG blob via `canvas.toBlob('image/png')`
- Uploads each page PNG to `paper-figures/{paper_id}/page_{pageNum}.png`
- Calls `run-figure-extraction` with `{ paper_id, page_images: [{ page_number, storage_path }] }`
- Runs once per paper (guarded by a ref + check for existing `image_url`)

### Edge function (`run-figure-extraction`)
- Accepts `page_images` array (new) or falls back to no-op if not provided
- Downloads each page PNG from storage
- Sends ALL page PNGs as `inline_data` parts (image/png) to **Gemini 3 Flash Preview** with `code_execution` tool enabled
- Prompt instructs Gemini to use PIL to detect and crop each figure, return cropped base64 PNGs
- Gemini 3 Flash's code_execution officially supports image manipulation via PIL
- Uploads cropped images to `paper-figures/{paper_id}/{fig_id}.png`
- Updates `structured_papers.figures` with `image_url`, `visual_description`, `sub_panels`, `citations`

### Model choice
**Gemini 3 Flash Preview** (`gemini-3-flash-preview`) — the only model that officially supports code_execution with image input. Called via native REST API using the existing `GOOGLE_API_KEY`.

### What stays unchanged
- `FigureCard.tsx` — already handles `image_url` (renders `<img>`) and `bounding_box` (renders via `FigureRenderer`) and fallback
- `FigureRenderer.tsx` — still works as fallback before extraction completes
- `FiguresSection.tsx` — unchanged
- `usePaperPdf.ts` — unchanged (reused by the new hook)
- All other pipeline steps — unchanged

