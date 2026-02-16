

## Fix the End-to-End Pipeline

There are 4 issues preventing the pipeline from completing and the progress from showing:

### Issue 1: Embedding Dimension Mismatch (Pipeline Crashes)

The `run-chunking-and-embedding` function uses OpenAI's `text-embedding-3-large` model which produces 3072-dimensional vectors, but the database `chunks.embedding` column only accepts 1536 dimensions. This causes every paper to fail at the chunking step.

**Fix:** Change the model in `supabase/functions/run-chunking-and-embedding/index.ts` line 216 from `text-embedding-3-large` to `text-embedding-3-small` (which outputs 1536 dimensions, matching the DB column).

### Issue 2: Real-time Updates Not Working (Progress Bars Frozen)

The `papers` table is not added to the `supabase_realtime` publication. The `useRealtimePaper` hook subscribes to changes but never receives any updates, so the UI appears stuck at "Parsing" even though the backend is progressing.

**Fix:** Run a database migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.papers;
```

### Issue 3: Summary and Module Generation Are Not Part of the Pipeline

`generate-summary` and `generate-module-content` are designed as **on-demand** functions -- they are called from the frontend when a user opens a paper and selects a persona/module. They are NOT invoked during the `orchestrate-pipeline` sequence. This is actually by design (they need a persona selection), but means the pipeline status "completed" only means the data is ready for on-demand generation.

No change needed here -- this is the correct architecture. Summaries and modules are generated lazily when a user views the paper.

### Issue 4: Simulated Impact Never Runs

Because chunking fails (Issue 1), the pipeline never reaches the `generate-simulated-impact` step. Fixing Issue 1 will automatically fix this.

---

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/run-chunking-and-embedding/index.ts` | Change embedding model from `text-embedding-3-large` to `text-embedding-3-small` |
| Database migration | `ALTER PUBLICATION supabase_realtime ADD TABLE public.papers;` |

After these two fixes:
- The pipeline will complete end-to-end: parse -> structure -> chunk + figures -> simulated impact -> completed
- The progress bars will update in real-time as each step finishes
- Once completed, viewing the paper will trigger on-demand summary and module generation
