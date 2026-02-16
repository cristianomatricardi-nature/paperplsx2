

## Fix Pipeline Timeout and Complete the Flow

### The Problem
The `orchestrate-pipeline` edge function calls `run-structuring` synchronously via `fetch()` and waits for the response. Structuring takes ~3 minutes (large OpenAI call), but edge functions timeout at ~150 seconds. The orchestrator receives a 504 error and marks the paper as failed, even though structuring actually completes successfully in the background.

This means steps 3-5 (chunking, figures, impact) never execute.

### The Fix: Make the Orchestrator Poll Instead of Wait

Instead of waiting for each function's HTTP response (which times out), the orchestrator should:
1. **Fire** each step
2. **Poll** the database for completion (the individual functions already update the DB when done)

### Changes

**File: `supabase/functions/orchestrate-pipeline/index.ts`**

Replace the `invokeFunction` helper with a fire-and-poll pattern:

- `fireFunction(fnName, payload)`: Sends the HTTP request but does NOT wait for the response body -- just confirms the request was accepted (or ignores timeout errors since the function continues running).
- `waitForStatus(expectedStatus, timeoutMs)`: Polls the `papers` table every 5 seconds waiting for the status to change to the expected value (each sub-function already updates the paper status when it completes).
- Update the pipeline sequence to:
  1. Set status `parsing`, fire `run-parser`, poll until status changes to `parsed` or the parser updates structured_papers
  2. Set status `structuring`, fire `run-structuring`, poll until `structured_papers` row exists for this paper
  3. Set status `chunking`, fire `run-chunking-and-embedding` + `run-figure-extraction` in parallel, poll until chunks exist
  4. Fire `generate-simulated-impact`, poll until `simulated_impact_scores` is set on the paper
  5. Set status `completed`

However, there is a simpler alternative approach:

### Simpler Alternative: Have Each Step Call the Next

Instead of a central orchestrator that waits, make each function trigger the next one in a chain (fire-and-forget):

1. `upload-handler` -> fires `run-parser`
2. `run-parser` (at the end, after success) -> updates status to `structuring`, fires `run-structuring`
3. `run-structuring` (at the end) -> updates status to `chunking`, fires `run-chunking-and-embedding` + `run-figure-extraction`
4. `run-chunking-and-embedding` (at the end) -> fires `generate-simulated-impact`
5. `generate-simulated-impact` (at the end) -> updates status to `completed`

This avoids any timeout issues since no function waits for another. Each function runs independently within its own timeout window.

**Recommended approach: Keep the orchestrator but add polling.** This keeps the pipeline logic centralized and easier to debug.

### Detailed Implementation (Polling Approach)

**`supabase/functions/orchestrate-pipeline/index.ts`** -- rewrite the pipeline logic:

```text
Replace invokeFunction with:

1. fireFunction(fnName, payload): 
   - fetch() with no await on response body
   - Just confirm it was dispatched

2. pollForCondition(checkFn, timeoutMs, intervalMs):
   - Loops every 5s calling checkFn()
   - checkFn queries DB to see if the step completed
   - Throws if timeout exceeded

Pipeline becomes:
- Step 1: updateStatus("parsing"), fireFunction("run-parser"), 
  pollForCondition(() => check parsed_text exists in structured_papers, 300s)

- Step 2: updateStatus("structuring"), fireFunction("run-structuring"),
  pollForCondition(() => check structured_papers.sections is not empty, 300s)

- Step 3: updateStatus("chunking"), 
  fireFunction("run-chunking-and-embedding"),
  fireFunction("run-figure-extraction"),
  pollForCondition(() => check chunks table has rows for this paper, 300s)

- Step 4: fireFunction("generate-simulated-impact"),
  pollForCondition(() => check papers.simulated_impact_scores is not null, 120s)

- Step 5: updateStatus("completed")
```

The key insight: each sub-function already writes its results to the database. We just need to poll the DB instead of waiting for the HTTP response.

### Important Note on `generate-summary` and `generate-module-content`

These two functions are **correctly not part of the pipeline**. They are on-demand functions that require a user's persona selection:

- `generate-summary` is called by `PersonalizedSummaryCard` when a user views a paper and selects a persona
- `generate-module-content` is called by `ModuleAccordion` when a user expands a module

This is the right design -- summaries and modules are generated lazily per-persona. The pipeline only needs to prepare the data (parse, structure, chunk, extract figures, score impact) so these on-demand functions can work.

### Additional Fix: run-structuring and run-parser Need Status Updates

Currently only the orchestrator updates the paper status. The individual functions do not. For the polling approach to work, we need to verify what each function writes to the DB upon completion:

- `run-parser`: writes to `structured_papers` (parsed_text field or sections) -- pollable
- `run-structuring`: writes/updates `structured_papers` with sections, claims, methods -- pollable  
- `run-chunking-and-embedding`: writes to `chunks` table -- pollable
- `run-figure-extraction`: writes figure URLs -- pollable
- `generate-simulated-impact`: writes `simulated_impact_scores` to `papers` -- pollable

All steps write detectable results, so polling will work without modifying the sub-functions.

