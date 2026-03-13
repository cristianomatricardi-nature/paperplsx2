

# Story Carousel Summary + Figure Role Classification + Researcher Paper Library

## Overview

Three interconnected changes: (1) add a `figure_role` classification to the Gemini figure extraction prompt, (2) transform the summary into a 4-slide story carousel that shows the contextual figure on the "What" slide, and (3) add a dual-mode paper library in researcher home — "My Papers" (parse-only, grey) vs "Paper++" (full pipeline, teal/green).

---

## 1. Figure Role Classification (Gemini Prompt Change)

**File: `supabase/functions/run-figure-extraction/index.ts`**

Add a `figure_role` field to the Gemini prompt output schema. Each figure gets classified as one of:
- `contextualization` — conceptual illustration showing the idea/big picture of the work
- `characterization` — material/sample characterization (SEM, XRD, spectra)
- `calculation` — computational results, simulations, theoretical plots
- `supporting_evidence` — experimental data directly supporting claims
- `methodology` — workflow diagrams, experimental setups
- `comparison` — benchmarking against other work

Add to the prompt instructions: "For each figure, classify its `figure_role` from: contextualization, characterization, calculation, supporting_evidence, methodology, comparison."

Add to the JSON output format example: `"figure_role": "contextualization"`.

**File: `src/types/structured-paper.ts`**

Add `figure_role?: 'contextualization' | 'characterization' | 'calculation' | 'supporting_evidence' | 'methodology' | 'comparison'` to the `Figure` interface.

---

## 2. Story Carousel Summary

### Edge function: `supabase/functions/generate-summary/index.ts`

- Accept optional `user_id` in request body
- Change prompt to return 4 structured cards:
  ```json
  {
    "cards": [
      { "slug": "what", "title": "The Discovery", "body": "...", "linked_module": "M1", "context_figure_id": "fig_1" },
      { "slug": "why",  "title": "Why It Matters", "body": "...", "linked_module": "M2" },
      { "slug": "how",  "title": "The Approach", "body": "...", "linked_module": "M3" },
      { "slug": "next", "title": "What To Do Now", "body": "...", "linked_module": "M5" }
    ],
    "disclaimer": "..."
  }
  ```
- For the "What" card: query `structured_papers.figures` to find the figure with `figure_role = 'contextualization'` (fallback: first figure). Include its `figure_id` as `context_figure_id` so the UI can render it.
- The "What" card prompt instructs: "Describe what the work is about with a broader conceptual look. If a contextualization figure exists, reference it and explain what it shows conceptually — do NOT include specific numerical/scientific results."
- For the "Next" card: if `user_id` is provided, fetch the user's other papers from `papers` table (status = 'completed' OR source_type = 'library', `id != current paper`), pull titles + abstracts from `structured_papers`, and include as researcher context so the LLM can compare and personalize actionable next steps.
- Cache key uses composite `persona_id` like `{subPersonaId}__usr_{userId}` to differentiate per-user summaries.

### Prompt composer: `supabase/functions/_shared/prompt-composers.ts`

- Update `composeSummaryPrompt` to produce the 4-card JSON structure instead of single paragraph.
- Add optional `researcherContext?: string` parameter — when present, the "What To Do Now" card instruction includes: "Compare this paper's contributions against the researcher's own work listed below. Identify synergies, gaps, or methods they could adopt."
- Add optional `contextFigure?: { id: string; caption: string; visual_description: string }` parameter — when present, the "What" card instruction references it.

### Frontend: `src/components/paper-view/PersonalizedSummaryCard.tsx`

- Replace single `<p>` with an Embla carousel (already installed) showing 4 slides.
- Each slide: icon + title + body text + "Explore in [Module] →" link that scrolls to that module accordion.
- The "What" slide renders the context figure (if `context_figure_id` is present) using `FigureRenderer` — cropped from the page PNG, showing the conceptual image alongside the text.
- Dot indicators below carousel.
- Backward compatibility: if cached content has `narrative_summary` (old format), render as single card.
- Audio player and policy tags remain below carousel.

### API: `src/lib/api.ts`

- Update `fetchSummary` to accept optional `userId` and pass it to the edge function.

### Callers: `ResearcherView.tsx`, `EducatorView.tsx`, `PolicyMakerView.tsx`, `FunderView.tsx`

- Pass `userId` from `useAuth()` down to `PersonalizedSummaryCard`.

---

## 3. Researcher Paper Library (Dual-Mode)

### Database: new `source_type` values

The `papers.source_type` column already exists (text, nullable). Use it to distinguish:
- `'upload'` or `null` — Paper++ (full pipeline, rendered)
- `'library'` — researcher's own paper (parse + structure only, NOT rendered as Paper++)

### Upload flow in researcher home

**File: `src/components/researcher-home/UploadSection.tsx`**

Add a second upload mode — a simple "Add to My Library" button/tab alongside the existing Paper++ generator. When uploading as library paper:
- Set `source_type = 'library'` on the papers row
- Run `upload-handler` → `orchestrate-pipeline` with a flag `library_only: true` that stops after parsing + structuring (no module generation, no figure extraction, no audio)

**File: `supabase/functions/orchestrate-pipeline/index.ts`**

- Accept `library_only` flag. When true: run `run-parser` → `run-structuring` → `run-chunking-and-embedding` then mark as `completed`. Skip module titles, figure extraction, and simulated impact.

### Paper Library UI

**File: `src/components/researcher-home/PaperLibrary.tsx`**

- Show all papers in a single list but visually differentiate:
  - **Paper++** cards: teal/green left border, "Paper++" badge, clickable → navigates to `/paper/{id}`
  - **Library** cards: grey left border, "My Paper" badge, compact/thin, shows title + authors + abstract snippet only, not clickable to Paper++ view
- Section header: "My Papers" with count badge (already exists)

**File: `src/components/researcher-home/PaperCard.tsx`**

- Accept `source_type` from paper data
- Render differently based on source_type: library papers get grey styling, no "View Paper++" button, show a small "Used for context" label

---

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/run-figure-extraction/index.ts` | Add `figure_role` to prompt + output schema |
| `src/types/structured-paper.ts` | Add `figure_role` to `Figure` interface |
| `supabase/functions/generate-summary/index.ts` | 4-card output, context figure, researcher papers fetch |
| `supabase/functions/_shared/prompt-composers.ts` | Update `composeSummaryPrompt` for cards + researcherContext + contextFigure |
| `src/components/paper-view/PersonalizedSummaryCard.tsx` | Embla carousel, figure on "What" slide, backward compat |
| `src/lib/api.ts` | Add `userId` to `fetchSummary` |
| `src/components/paper-view/views/ResearcherView.tsx` | Pass userId |
| `src/components/paper-view/views/EducatorView.tsx` | Pass userId |
| `src/components/paper-view/views/PolicyMakerView.tsx` | Pass userId |
| `src/components/paper-view/views/FunderView.tsx` | Pass userId |
| `src/components/researcher-home/UploadSection.tsx` | Add "Add to Library" upload mode |
| `src/components/researcher-home/PaperCard.tsx` | Dual styling for library vs Paper++ |
| `src/components/researcher-home/PaperLibrary.tsx` | Visual differentiation of paper types |
| `supabase/functions/orchestrate-pipeline/index.ts` | `library_only` flag to skip modules/figures |

