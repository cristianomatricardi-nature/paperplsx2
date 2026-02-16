

## Fix Figures: Connect Bounding Box Rendering to Figure Cards

### The problem

Figures exist in the database with captions and metadata, but have no `image_url` and no `bounding_box` data. The `FigureCard` component only checks for `image_url` to display images. Meanwhile, a `FigureRenderer` component already exists that can crop figures from the PDF using bounding boxes -- but it's never used in `FigureCard`.

### What we'll do

1. **Run figure extraction for paper 13** -- invoke the `run-figure-extraction` edge function to populate bounding boxes via OpenAI
2. **Update `FigureCard` to use `FigureRenderer`** -- when `bounding_box` exists, render the figure from the PDF instead of showing a placeholder
3. **Integrate figure extraction into the pipeline** -- add it as a step in `orchestrate-pipeline` so future papers get bounding boxes automatically

### Technical details

**1. Update `FigureCard.tsx`**

- Accept a new `storagePath` prop (the paper's PDF storage path)
- When `figure.image_url` is missing but `figure.bounding_box` exists, render `FigureRenderer` instead of the placeholder
- Same logic in the expanded modal view

**2. Update `FiguresSection.tsx`**

- Accept and pass down `storagePath` to each `FigureCard`

**3. Update `PaperViewPage.tsx`**

- Pass `storagePath` to `FiguresSection`

**4. Add figure extraction to `orchestrate-pipeline`**

- After the structuring step completes, call `run-figure-extraction` so bounding boxes are populated automatically for all new papers

**5. Trigger extraction for paper 13**

- Manually invoke `run-figure-extraction` with `{ paper_id: 13 }` to populate the bounding boxes now

### Files changed

| File | Change |
|------|--------|
| `src/components/paper-view/FigureCard.tsx` | Add `storagePath` prop, use `FigureRenderer` when bounding box exists |
| `src/components/paper-view/FiguresSection.tsx` | Accept and pass `storagePath` prop |
| `src/pages/PaperViewPage.tsx` | Pass `storagePath` to `FiguresSection` |
| `supabase/functions/orchestrate-pipeline/index.ts` | Add `run-figure-extraction` call after structuring |

