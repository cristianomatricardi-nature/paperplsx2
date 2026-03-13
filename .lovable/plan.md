
Goal: Ensure “What To Do Now” is personalized only from papers in **My Papers** (library papers), never from Paper++ uploads.

What I verified:
1. In `PaperLibrary.tsx`, **My Papers** is correctly defined as `source_type === 'library'`.
2. In `generate-summary/index.ts`, personalization context currently pulls:
   - same user
   - `status = completed`
   - **no `source_type = 'library'` filter**
3. Runtime logs confirm this is happening: `Including 10 researcher papers as context`.
4. Database check for your user shows `0` library papers and many completed `pdf_upload` papers, so personalization is currently using Paper++ uploads by mistake.

Root cause:
- The summary function is using **all completed user papers** instead of only **My Papers**.
- So even when My Papers is empty, “What To Do Now” still gets context from completed Paper++ uploads and writes personalized-looking text.

Implementation plan:
1. Update personalization query in `supabase/functions/generate-summary/index.ts`:
   - Add `.eq("source_type", "library")`
   - Keep `.eq("user_id", userId)`, `.neq("id", paperId)`, `.in("status", ["completed"])`
2. Strengthen cache correctness for this logic:
   - Bump/version the summary cache persona key for user-scoped summaries (so old mixed-context summaries are not reused).
   - Keep/return `personalized` consistently on both fresh and cached responses.
3. Preserve existing behavior when My Papers is empty:
   - “What To Do Now” remains general (non-personalized), with the existing info banner.
4. Small frontend safety in `src/components/paper-view/PersonalizedSummaryCard.tsx`:
   - Default missing `personalized` to `false` so old cache payloads can’t hide the banner.

Files to change:
- `supabase/functions/generate-summary/index.ts` (primary fix + cache consistency)
- `src/components/paper-view/PersonalizedSummaryCard.tsx` (defensive fallback)

Technical details:
- New personalization dataset = `papers WHERE user_id = :userId AND source_type = 'library' AND status = 'completed' AND id != :paperId`.
- Cache key update avoids serving stale summaries that were generated with old (incorrect) paper scope.
- No database migration required.

Validation checklist after implementation:
1. User with no My Papers + many Paper++ papers:
   - `generate-summary` logs should show no “Including X researcher papers as context”.
   - response `personalized: false`.
   - banner appears on “What To Do Now”.
2. User with My Papers present:
   - logs should show included context count from library papers only.
   - response `personalized: true`.
3. Re-open same paper/persona:
   - cached response preserves correct `personalized` behavior.
