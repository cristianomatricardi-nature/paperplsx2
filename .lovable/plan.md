

# Complete Orchestration Pipeline — Current + Planned

## Current Pipeline (as implemented)

```text
USER UPLOAD
    |
    v
upload-handler
    |- Authenticates user via JWT
    |- Stores PDF in research-papers bucket
    |- Creates papers row (status: "uploaded")
    |- Fires orchestrate-pipeline
    |
    v
orchestrate-pipeline (fire-and-poll, background via EdgeRuntime.waitUntil)
    |
    |  STEP 1: PARSING                          status → "parsing"
    |  ├─ Fire: run-parser
    |  │   ├─ Downloads PDF from research-papers bucket
    |  │   ├─ pdfjs-serverless: extracts text per page
    |  │   ├─ Builds page_map { pageNum → text }
    |  │   ├─ Uploads temp/{paper_id}/parsed.json to storage
    |  │   └─ Sets papers.num_pages (completion signal)
    |  └─ Poll: papers.num_pages != null (timeout 5 min)
    |
    |  STEP 2: STRUCTURING                      status → "structuring"
    |  ├─ Fire: run-structuring
    |  │   ├─ Downloads parsed.json from storage
    |  │   ├─ Sends full page-mapped text to GPT-4o
    |  │   ├─ Extracts: metadata, sections, claims, methods,
    |  │   │   figures (text-inferred), tables, equations,
    |  │   │   negative_results, call_to_actions, scicomm_hooks, references
    |  │   ├─ Upserts structured_papers row
    |  │   └─ Updates papers.title/authors/abstract/doi/journal
    |  └─ Poll: structured_papers.sections is non-empty array (timeout 5 min)
    |
    |  STEP 3: PARALLEL                         status → "chunking"
    |  ├─ Fire: run-chunking-and-embedding
    |  │   ├─ Reads structured_papers (sections, claims, methods)
    |  │   ├─ Creates semantic chunks with module_relevance scores
    |  │   ├─ Generates OpenAI embeddings for each chunk
    |  │   └─ Inserts into chunks table (completion signal)
    |  │
    |  ├─ Fire: run-figure-extraction (CURRENT — OpenAI-based)
    |  │   ├─ Reads structured_papers.figures (text-inferred list)
    |  │   ├─ Downloads PDF, encodes as base64
    |  │   ├─ Sends to OpenAI Responses API (gpt-4o) for bounding boxes
    |  │   ├─ Updates structured_papers.figures with bounding_box coords
    |  │   └─ Falls back to full-page bbox if detection fails
    |  │
    |  └─ Poll: chunks table has rows for paper_id (timeout 5 min)
    |     (figure extraction is non-blocking — runs in parallel)
    |
    |  STEP 4: SIMULATED IMPACT
    |  ├─ Fire: generate-simulated-impact
    |  │   ├─ Reads structured_papers metadata/claims/methods
    |  │   ├─ GPT-4o generates impact scores
    |  │   └─ Sets papers.simulated_impact_scores (completion signal)
    |  └─ Poll: papers.simulated_impact_scores != null (timeout 2 min)
    |
    |  STEP 5: FINALIZE                         status → "completed"
    |
    v
PAPER READY — on-demand generation begins
    |
    ├─ generate-summary (per sub-persona, on first view)
    ├─ generate-module-content (per module + sub-persona, on first view)
    ├─ generate-policy-view / generate-funder-view / generate-educator-view
    ├─ generate-audio-hook (ElevenLabs TTS, fire-and-poll via audio_hook_jobs)
    └─ generate-policy-infographic / generate-protocol-infographic
       (fire-and-poll via infographic_jobs)
```

## Planned Changes: Gemini-Powered Figure Extraction

### What changes in the pipeline

Step 3's `run-figure-extraction` gets a **full rewrite**. Everything else stays the same.

```text
  STEP 3 (revised): PARALLEL                   status → "chunking"
  ├─ Fire: run-chunking-and-embedding           (unchanged)
  │
  ├─ Fire: run-figure-extraction (NEW — Gemini-based)
  │   ├─ Read structured_papers.figures (text-inferred captions + page_numbers)
  │   ├─ Read structured_papers.sections (full text for citation scanning)
  │   ├─ Download PDF from research-papers bucket
  │   │
  │   ├─ PAGE RENDERING (new)
  │   │   ├─ Identify unique pages that contain figures
  │   │   ├─ Use pdfjs-serverless to render each page → PNG at 2x scale
  │   │   └─ Output: { page_number, base64_png }[]
  │   │
  │   ├─ GEMINI VISION + CODE EXECUTION (new)
  │   │   ├─ For each figure-bearing page, call Gemini 3 Flash Preview
  │   │   │   via native REST API (requires GOOGLE_API_KEY)
  │   │   ├─ Send: page PNG as inline_data (image/png) + prompt with
  │   │   │   known figure captions for that page
  │   │   ├─ code_execution tool enabled → model runs Python to:
  │   │   │   - Detect figure boundaries
  │   │   │   - Crop each figure and sub-panel (fig_1a, fig_1b, etc.)
  │   │   │   - Return cropped images as base64 PNG
  │   │   └─ Also returns per figure:
  │   │       - visual_description (trends, axes, data patterns)
  │   │       - sub_panels[] (label, description, cropped image)
  │   │       - citations[] (text snippets where "Fig. X" appears,
  │   │         section heading, page number)
  │   │
  │   ├─ UPLOAD CROPS (replaces Phase C)
  │   │   ├─ Upload each cropped PNG to paper-figures bucket
  │   │   │   Path: {paper_id}/{fig_id}.png
  │   │   │   Sub-panels: {paper_id}/{fig_id}_{label}.png
  │   │   └─ Construct public URLs
  │   │
  │   ├─ CITATION MAPPING (new)
  │   │   ├─ Regex scan of structured_papers.sections for
  │   │   │   Fig.\s*\d+, Figure\s+\d+, Fig\s+\d+[a-z]?
  │   │   ├─ Cross-reference with Gemini's citation output
  │   │   ├─ Build figure_references map:
  │   │   │   { "sec_1": ["fig_1", "fig_3a"], "sec_4": ["fig_2b"] }
  │   │   └─ Match section IDs by heading similarity
  │   │
  │   └─ UPDATE DB
  │       ├─ Update structured_papers.figures with:
  │       │   image_url, visual_description, sub_panels[], citations[]
  │       └─ Store figure_references map in structured_papers
  │
  └─ Poll: chunks exist (blocking, timeout 5 min)
```

### Downstream effects on on-demand generation

```text
generate-module-content (updated)
  ├─ Load structured_papers.figures with citations + visual_description
  ├─ Match figure citations to current module's relevant sections
  ├─ Inject into prompt: "Figure fig_1a is cited at 'As shown in Fig. 1a,
  │   the morphology...' (p.5). Place [FIGURE: fig_1a] at the corresponding
  │   location in your output."
  └─ AI produces [FIGURE: fig_X] tokens at correct inline positions

generate-summary (updated)
  └─ Same pattern: include figure context so summaries reference figures

ModuleContentRenderer (updated)
  ├─ replaceFigureTokens already handles [FIGURE: fig_X] → FigurePlaceholder
  ├─ Extended to support sub-panel tokens: [FIGURE: fig_1a]
  │   Looks up sub-panel within parent figure's sub_panels[]
  └─ FigurePlaceholder renders image_url directly (no PDF cropping needed)
```

### Type changes

```text
Figure (structured-paper.ts) — add:
  ├─ sub_panels?: FigureSubPanel[]
  │   └─ { panel_id, label, description, image_url }
  ├─ visual_description?: string
  └─ citations?: FigureCitation[]
      └─ { text_snippet, section_id?, page_number }
```

### New secret required

`GOOGLE_API_KEY` — Google AI Studio key for native Gemini API with `code_execution` support. Must be added before implementation.

### Files changed

| File | Change |
|------|--------|
| `run-figure-extraction/index.ts` | Full rewrite: page rendering → Gemini vision → crop upload → citation mapping |
| `src/types/structured-paper.ts` | Add `sub_panels`, `visual_description`, `citations` to Figure |
| `generate-module-content/index.ts` | Inject figure citation map + visual descriptions into prompt |
| `generate-summary/index.ts` | Same — include figure context for inline placement |
| `ModuleContentRenderer.tsx` | Support sub-panel tokens `[FIGURE: fig_Xa]` |
| `FigurePlaceholder.tsx` | Render sub-panels as grid when present |

### What stays unchanged

- `orchestrate-pipeline/index.ts` — no changes needed (figure extraction already fire-and-forget, non-blocking)
- `run-parser/index.ts` — unchanged
- `run-structuring/index.ts` — unchanged (still does text-based figure inference; Gemini enriches after)
- `run-chunking-and-embedding/index.ts` — unchanged
- `generate-simulated-impact/index.ts` — unchanged
- `upload-handler/index.ts` — unchanged
- `paper-figures` storage bucket — already exists and is public
- `FiguresSection` gallery — still works, now with real images via `image_url`

