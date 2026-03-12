

## Plan: Parallel Figure Extraction with PNG Images + Code Execution

### Architecture: Two Parallel Tracks

```text
Upload PDF
  ├── Track A (server - orchestrator): parse → structure → chunk → impact → completed
  │                                                                    
  └── Track B (client - immediate):    PDF → render ALL pages to PNG → upload to paper-figures bucket
                                                                          │
                              ┌───────────────────────────────────────────┘
                              ▼
              Orchestrator (after structuring): fires run-figure-extraction 
              with page_images paths constructed from papers.num_pages
                              │
                              ▼
              Edge function: downloads PNGs from bucket → sends to Gemini 
              with code_execution → saves bounding_boxes to DB
```

### Changes

**1. `src/components/researcher-home/UploadSection.tsx`** — Start PNG rendering immediately after upload

After `uploadPaper()` returns `paper_id`, fire-and-forget: load the PDF from the `selectedFile` using pdf.js, render every page at 2x scale to PNG, upload each to `paper-figures/{paperId}/page_{N}.png`. No Gemini call here — just prepare the PNGs. This runs client-side in parallel with the orchestrator.

**2. `supabase/functions/orchestrate-pipeline/index.ts`** — Pass page_images to figure extraction

At Step 3 (after structuring), read `papers.num_pages` (set during parsing). Construct `page_images` array: `[{ page_number: 1, storage_path: "{paperId}/page_1.png" }, ...]`. Fire `run-figure-extraction` with `{ paper_id, page_images }` — this gives the edge function the PNG paths it needs. Still fire-and-forget (non-blocking, parallel with chunking). No other pipeline changes.

**3. `supabase/functions/run-figure-extraction/index.ts`** — Add server-side retry for 503/429

Add a retry loop (3 attempts, exponential backoff) around the Gemini API call inside the edge function itself. If all retries fail with 429/503, save a `figure_extraction_status: "unavailable"` field to `structured_papers` so the UI knows extraction failed due to API limits. Keep everything else unchanged: PNG images + code_execution + Gemini 3 Flash Preview.

**4. `src/hooks/useFigureExtraction.ts`** — Become a fallback/retry mechanism

Check if figures have `bounding_box`. If yes, do nothing (extraction already succeeded). If no, check if PNGs exist in storage — if they do, call the edge function (existing retry logic). If PNGs don't exist, render and upload them first, then call. This handles the case where a user views a paper before Track B completed.

**5. `src/components/paper-view/FigureCard.tsx`** — Graceful degradation message

When `bounding_box` is null, check `structured_papers.figure_extraction_status`. If `"unavailable"`, show: "Figure image extraction is temporarily unavailable due to high API usage. Contextual analysis and metadata are still available below." Instead of generic "📊 Figure from page X" placeholder.

### What is NOT touched
- `run-parser`, `run-structuring`, `run-chunking-and-embedding` — unchanged
- `generate-simulated-impact`, all module generation — unchanged
- All persona views, RAG, UI module rendering — unchanged
- Pipeline status flow (parsing → structuring → chunking → completed) — unchanged
- Gemini prompt, code_execution, PNG-based analysis — unchanged

