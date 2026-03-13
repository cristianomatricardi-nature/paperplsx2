
## Dynamic Waveform Audio Player (NotebookLM-style)

(Previous plan — implemented)

## Gemini-Powered Figure Extraction with Citation Mapping (IMPLEMENTED)

(Previous plan — implemented)

## Enhanced Figure Extraction: Coordinates-Only + PNG Cropping (IMPLEMENTED)

(Previous plan — implemented)

## Gemini-Driven Figure Discovery (IMPLEMENTED)

(Previous plan — implemented)

## Story Carousel Summary + Figure Role Classification + Researcher Paper Library (IMPLEMENTED)

### Changes

| File | Status |
|------|--------|
| `src/types/structured-paper.ts` | ✅ Added `FigureRole` type and `figure_role` to `Figure` interface |
| `src/types/database.ts` | ✅ Added `'library'` to `source_type` union |
| `supabase/functions/run-figure-extraction/index.ts` | ✅ Added `figure_role` classification to Gemini prompt, interface, and merge logic |
| `supabase/functions/_shared/prompt-composers.ts` | ✅ Rewrote `composeSummaryPrompt` for 4-card story output with researcherContext + contextFigure |
| `supabase/functions/generate-summary/index.ts` | ✅ Accepts `user_id`, fetches researcher papers, finds contextualization figure, composite cache key |
| `src/components/paper-view/PersonalizedSummaryCard.tsx` | ✅ Embla carousel with 4 slides, context figure on "What", backward compat for old format |
| `src/lib/api.ts` | ✅ `fetchSummary` accepts optional `userId` |
| `src/components/paper-view/views/ResearcherView.tsx` | ✅ Passes `userId`, `figures`, `onModuleClick` to summary card |
| `src/components/paper-view/views/EducatorView.tsx` | ✅ Passes `userId` |
| `src/components/paper-view/views/PolicyMakerView.tsx` | ✅ Passes `userId` |
| `src/components/paper-view/views/FunderView.tsx` | ✅ Passes `userId` |
| `src/pages/PaperViewPage.tsx` | ✅ Passes `user?.id` to all views |
| `src/components/researcher-home/UploadSection.tsx` | ✅ Added "My Library" tab with library upload mode |
| `src/components/researcher-home/PaperCard.tsx` | ✅ Dual styling: teal/primary border for Paper++, grey for library papers |
| `supabase/functions/upload-handler/index.ts` | ✅ Accepts `source_type` from form data, skips auto-pipeline for library |
| `supabase/functions/orchestrate-pipeline/index.ts` | ✅ `library_only` flag skips figures/modules/impact, marks completed after chunking |
