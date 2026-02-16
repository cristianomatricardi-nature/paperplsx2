

## Self-Contained Knowledge Lenses: Backend Prompts + Claims Carousel

### Problem

The modules currently extract only their "slice" of the paper (e.g., M1 pulls only from introduction/discussion, M3 pulls only methods). This makes each module feel like a fragment rather than a complete lens. The user wants each module to be **self-contained**: it should cover the entire paper but with a different emphasis. Additionally, the M2 claims are stacked vertically, making them hard to browse -- a horizontal scrollable carousel would be better.

### Two changes

**A. Backend: Rewrite MODULE_QUERIES and MODULE_PROMPTS** so each module retrieves broader context from the paper and generates a self-contained narrative with a specific focal point.

**B. Frontend: Replace vertical ClaimCard list with a horizontal scrollable carousel.**

---

### A. Backend prompt restructuring

**File: `supabase/functions/generate-module-content/index.ts`**

**MODULE_QUERIES** (the embedding search queries) currently target narrow topics. We broaden each to pull chunks from the full paper while weighting toward the module's focus:

| Module | Current query (narrow) | New query (broad + focused) |
|--------|----------------------|---------------------------|
| M1 | "main contribution, novelty, impact..." | "introduction, background, motivation, contribution, novelty, significance, key results summary, discussion of implications" |
| M2 | "claims, evidence, findings..." | "results, findings, statistical analysis, evidence, claims, methodology context, discussion of limitations" |
| M3 | "methods, protocols, procedures..." | "methods, protocols, experimental setup, research context and motivation, key results validating the approach" |
| M4 | "negative results, failed experiments..." | "negative results, null findings, limitations, failed approaches, context of what was expected, discussion" |
| M5 | "future directions, recommendations..." | "future work, recommendations, conclusions, research context, key findings motivating next steps" |
| M6 | "plain language summary, public impact..." | "abstract, introduction, key results, real world applications, conclusions, broader impact" |

Also increase `p_match_count` from 12 to 15 to pull more diverse chunks.

**MODULE_PROMPTS** restructured so each module generates a self-contained narrative:

Each prompt will now instruct the AI to produce:
1. **Context Bridge** (2-3 sentences) -- what is this paper about, why does it matter (present in every module)
2. **Focal content** -- the module's main lens (metrics for M1, claims for M2, protocols for M3, etc.)
3. **Cross-reference summary** -- brief pointers to what other modules cover in more depth

For example, M1 prompt changes to emphasize: "Pull heavily from the introduction to set context. Include ALL quantitative metrics from results. Add a brief discussion synthesis. The reader should be able to understand the paper's contribution without opening any other module."

M3 prompt changes to: "Start with 2-3 sentences of research context (what problem is being solved and why). Then provide the full protocol detail. End with a brief note on which results validate these methods."

The JSON schema stays the same (still uses `tabs` structure) but each section's content will be richer and more self-contained.

**Cache invalidation**: After deploying the updated prompts, we delete existing cached content for paper 9 so the modules regenerate with the new prompts.

---

### B. Frontend: Horizontal claims carousel

**File: `src/components/paper-view/renderers/ClaimCard.tsx`** -- minor width adjustments to work as a carousel card (fixed width ~320px, flex-shrink-0).

**File: `src/components/paper-view/ModuleContentRenderer.tsx`** -- replace the vertical `space-y-3` div for M2 claims with a horizontally scrollable container using `embla-carousel-react` (already installed).

The carousel will:
- Show one claim card at a time on mobile, ~2 on desktop
- Have left/right navigation arrows
- Show dot indicators for position
- Each card is a fixed-width ClaimCard with the same content as today
- Snap scrolling for a "picker wheel" feel

---

### Technical details

**Files to modify:**

| File | Change |
|------|--------|
| `supabase/functions/generate-module-content/index.ts` | Rewrite MODULE_QUERIES (broader retrieval) and MODULE_PROMPTS (self-contained lens instructions); increase chunk count to 15 |
| `src/components/paper-view/ModuleContentRenderer.tsx` | Replace M2 claims vertical list with embla-carousel horizontal scroller |
| `src/components/paper-view/renderers/ClaimCard.tsx` | Add fixed width + flex-shrink-0 for carousel layout |

**Database operation:**
- Delete cached content for paper 9 to force regeneration: `DELETE FROM generated_content_cache WHERE paper_id = 9 AND content_type = 'module'`

**No new dependencies** -- `embla-carousel-react` is already installed.

**No schema changes** -- the JSON structure returned by the AI stays the same, only the content quality and breadth changes.

