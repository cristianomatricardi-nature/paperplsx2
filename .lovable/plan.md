
Goal: fix why extracted figure images are not appearing, while keeping Gemini 3 Flash Preview + code_execution.

What’s happening now (confirmed):
- `paper-figures` has only `49/page_2.png`, `49/page_5.png` (and similar for 48), no `fig_*.png`.
- `structured_papers.figures` for papers 48/49 has 0 `image_url` entries.
- `run-figure-extraction` logs show Gemini calls but repeated `503 UNAVAILABLE` from Gemini 3 Flash Preview.
- Function currently converts Gemini errors into “0 figures uploaded” and still returns success-like output.
- Client hook triggers once and does not reliably retry; page also does not re-fetch `structured_papers` after extraction.

Implementation plan:

1) Harden `run-figure-extraction` error handling and retries
- File: `supabase/functions/run-figure-extraction/index.ts`
- Add retry wrapper for Gemini call (exponential backoff + jitter) on `503/429/network`.
- If all retries fail, return HTTP 503 with explicit `retryable: true` (do not silently continue).
- Treat “empty parsed result” as failure when figures were requested.
- Improve response parsing to support:
  - JSON array directly
  - object wrapper like `{ extracted_figures: [...] }`
  - text mixed with code_execution output (extract JSON block robustly)
- Sanitize base64 before decode/upload (strip `data:image/...;base64,`, whitespace).

2) Make client extraction resilient
- File: `src/hooks/useFigureExtraction.ts`
- Read `data` from `supabase.functions.invoke` (not only `error`).
- Retry invoke when response is retryable or `images_uploaded === 0` (bounded attempts).
- Do not permanently lock with `triggeredRef` on failed attempts; allow retry path.
- Add structured logging for attempt number and server response.

3) Refresh UI after successful extraction
- File: `src/pages/PaperViewPage.tsx`
- Add a `refetchStructuredPaper()` function.
- Pass callback to `useFigureExtraction`; on success, reload `structured_papers` so images appear without manual refresh.

4) Verification
- Re-run extraction for paper 49 and confirm:
  - New objects `49/fig_*.png` exist in `paper-figures`.
  - `structured_papers.figures[*].image_url` is populated.
  - Figures render in `FigureCard` and modal.
  - If Gemini is overloaded, user sees retry behavior instead of silent success with zero images.
