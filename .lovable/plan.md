

# Separate Library Paper Storage + Rich Personalization Context

## What's Already Working
The orchestrate-pipeline with `library_only: true` already correctly stops after parse → structure → chunk → completed. No modules, no figures, no simulated impact are generated for library papers. This is correct.

## What Needs to Change

### 1. Separate Storage Folder for Library Papers
**File: `supabase/functions/upload-handler/index.ts`**

Currently all papers are stored at `{user_id}/{timestamp}_{filename}`. Library papers should go to a dedicated subfolder: `{user_id}/library/{timestamp}_{filename}`.

This keeps library papers organized separately from Paper++ uploads.

### 2. Richer Personalization in "What To Do Now"
**File: `supabase/functions/generate-summary/index.ts`**

Currently the personalization query only fetches `title` and `abstract` from library papers — a very thin context. After structuring, each library paper has rich data in `structured_papers`: claims, methods, sections, call-to-actions, etc.

Change: For each library paper, also fetch its `structured_papers` data (claims, methods, abstract, sections) and build a much richer context block for the LLM. This way the "What To Do Now" card can identify methodological overlaps, complementary findings, gaps to fill, and concrete synergies across ALL library papers.

**New personalization context flow:**
1. Query all `papers` where `user_id = X`, `source_type = 'library'`, `status = 'completed'`
2. For each, join with `structured_papers` to get claims, methods, sections
3. Build a comprehensive researcher profile: "Paper A claims X using method Y; Paper B claims Z using method W..."
4. Pass this rich context to the LLM prompt for the "next" card

### 3. Updated Prompt Instructions
**File: `supabase/functions/_shared/prompt-composers.ts`**

Update the researcher context instruction to tell the LLM it has structured analysis data (not just abstracts) and should cross-reference claims, methods, and findings across all library papers to produce actionable, specific next steps.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/upload-handler/index.ts` | Store library papers at `{user_id}/library/...` path |
| `supabase/functions/generate-summary/index.ts` | Fetch `structured_papers` (claims, methods, sections) for all library papers, build rich cross-paper context |
| `supabase/functions/_shared/prompt-composers.ts` | Update researcher context prompt to leverage rich structured data |

## Technical Detail

**Rich context builder (generate-summary):**
```
For each library paper:
  - Title + abstract
  - Top claims (statement + strength + evidence)
  - Methods used (technique + description)
  - Key sections (headings + brief content)
  
Concatenate across all library papers → pass as RESEARCHER'S BODY OF WORK
```

This gives the LLM enough signal to say things like: "Your work on X uses method A — this paper's method B could complement your approach" rather than generic advice based on abstracts alone.

No database migrations needed. No frontend changes needed.

