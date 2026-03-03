

# Module-Powered Personalized Summary (Revised Plan)

## Clarification: RAG stays intact

The RAG pipeline (chunking, embeddings, `match_chunks`) is **not being removed** from the project. It remains the backbone for generating module content (M1–M6) via `generate-module-content`. The only change is that the **summary edge function** (`generate-summary/index.ts`) will stop doing its own separate RAG query and instead read the already-generated module content from `generated_content_cache`. Think of it as: RAG → Modules → Summary, instead of RAG → Summary in parallel.

```text
Current flow:
  PDF → chunking → embeddings → match_chunks ──→ Module generation (M1-M6)
                                               └─→ Summary generation (separate RAG query)

New flow:
  PDF → chunking → embeddings → match_chunks → Module generation (M1-M6)
                                                        │
                                                        ▼
                                              Summary generation (reads cached modules)
```

## Changes

### 1. `supabase/functions/_shared/sub-personas.ts` — Add `summaryModules` field

Add `summaryModules: string[]` to the `SubPersona` interface. Per-persona mapping:

| Personas | Modules |
|----------|---------|
| phd_postdoc, pi_tenure | M1, M2, M3, M4, M5 |
| think_tank, gov_institution | M1, M2, M5 |
| funder_governmental, funder_private | M1, M2, M5 |
| science_educator | M2, M3, M6 |
| industry_rd | M1, M2, M3 |
| ai_agent | M1, M2, M3, M5 |

### 2. `supabase/functions/generate-summary/index.ts` — Read modules instead of doing RAG

- Remove the embedding + `match_chunks` calls **from this function only** (they remain in `generate-module-content`)
- Instead, query `generated_content_cache` for the persona's `summaryModules` for that paper
- Extract key fields from each module's cached JSON (e.g., `core_contribution` from M1, `claims` from M2, method `steps` from M3, `actions` from M5, `hooks` from M6)
- Build `contextText` from these extracts and pass to `composeSummaryPrompt`
- If module cache is empty (modules not generated yet), fall back to the paper's abstract

### 3. `supabase/functions/_shared/prompt-composers.ts` — Update `composeSummaryPrompt`

- Remove the "Broader Impact Check" block entirely
- Replace the TASK section with a What/Why/How narrative structure:
  - **What**: key findings and contribution
  - **Why**: the research gap this closes
  - **How**: methodological approach
- Cap at **200 words**, single flowing paragraph, no bullets
- Always include an AI disclaimer in the output JSON: `"disclaimer": "..."`
- The function signature stays the same (`persona, contextText`) — only the prompt text changes

### 4. `src/components/paper-view/PersonalizedSummaryCard.tsx` — Show disclaimer

- Add `disclaimer?: string` to `SummaryContent` interface
- Render a small muted italic line below the narrative paragraph with the disclaimer text (use `content.disclaimer` or a hardcoded fallback)

### What is NOT changing
- `run-chunking-and-embedding` — untouched
- `match_chunks` DB function — untouched
- `generate-module-content` — untouched (still uses RAG)
- All chunking/embedding infrastructure — untouched

