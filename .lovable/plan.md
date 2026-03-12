

## Plan: Enhanced Prompt + PNG-Based Cropping

### Two changes

**1. Richer Gemini prompt with text-reference context**

Update the prompt in `run-figure-extraction/index.ts` to instruct Gemini to:
- Read all visible text on the page images AND the provided paper sections
- Find every mention of each figure and sub-panel (e.g. "Fig. 2b shows...", "as illustrated in Figure 3a...")
- Use those text references to build richer `visual_description` and per-panel `explanation` fields covering: what is shown, the scientific concepts, and what relationship/conclusion the figure provides
- Return a new `contextual_analysis` field per figure summarizing how the paper uses it

**2. Crop from PNG instead of PDF — yes, this is better**

Currently `FigureRenderer` re-renders the PDF page via pdf.js every time it needs to crop a figure. But the hook already uploads high-res PNGs to `paper-figures/{paperId}/page_{pageNum}.png` (public bucket). Using those PNGs directly is better because:
- The PNG is exactly what Gemini analyzed, so bounding box coordinates match perfectly
- No pdf.js re-rendering overhead on each view (expensive, slow)
- Simpler code path: just load an `<img>` from the public URL and crop with canvas
- The `page_number` already serves as the unique identifier → PNG path is deterministic: `paper-figures/{paperId}/page_{pageNum}.png`

### Changes

| File | What |
|------|------|
| `supabase/functions/run-figure-extraction/index.ts` | Rewrite prompt to include text-reference scanning. Add instruction to find all mentions of each figure in the paper sections and use them to enrich descriptions. Remove base64 image upload logic. Return only bounding boxes (normalized 0-1) + enriched metadata. Add `page_image_id` (e.g. `page_3`) in each figure's bounding box response so the client knows which PNG to crop from. |
| `src/types/structured-paper.ts` | Add `page_image_id` to `Figure.bounding_box` type. Add optional `contextual_analysis` and `explanation` to `FigureSubPanel`. |
| `src/components/paper/FigureRenderer.tsx` | Replace pdf.js rendering with direct PNG loading from the public `paper-figures` bucket URL. Load `<img>` from `{supabaseUrl}/storage/v1/object/public/paper-figures/{paperId}/page_{pageNumber}.png`, then crop using canvas with the bounding box coordinates. Remove `usePaperPdf` dependency entirely. |
| `src/hooks/useFigureExtraction.ts` | Update success check: instead of checking `images_uploaded`, check for `figures_extracted > 0` (since we no longer upload cropped images, just save coordinates). Keep PNG upload logic (still needed for Gemini input). |
| `src/components/paper-view/FigureCard.tsx` | Update the fallback chain: `image_url` → `bounding_box + FigureRenderer` (now PNG-based) → placeholder. Pass `paperId` to `FigureRenderer` instead of `storagePath`. |

### Updated Figure bounding_box schema

```typescript
bounding_box?: {
  x: number;      // normalized 0-1
  y: number;      // normalized 0-1
  width: number;  // normalized 0-1
  height: number; // normalized 0-1
  page_image_id?: string; // e.g. "page_3" → resolves to paper-figures/{paperId}/page_3.png
};
```

### Prompt additions (key sections)

```text
CONTEXTUAL ANALYSIS:
- Search the provided paper sections for ALL references to each figure 
  (e.g. "Fig. 1a", "Figure 2", "shown in Fig. 3b")
- For each reference, extract the surrounding sentence and use it to understand:
  - What the figure demonstrates scientifically
  - What concepts or relationships it illustrates
  - What conclusions the authors draw from it
- Synthesize these references into a rich contextual_analysis field
- For each sub-panel, provide an explanation that combines visual observation 
  with what the paper text says about it
```

### Rendering flow
```text
FigureRenderer receives: paperId=42, figure.page_number=3, figure.bounding_box={x,y,w,h}
  → constructs URL: paper-figures/42/page_3.png (public bucket)
  → loads as HTMLImageElement
  → crops bounding_box region via canvas
  → displays cropped result
```

