

# Fix: Use Gemini 3 Flash Preview for Figure Extraction

## Problem
Line 225 of `supabase/functions/run-figure-extraction/index.ts` calls `gemini-2.5-flash` instead of `gemini-3-flash-preview`. Gemini 2.5 Flash does not support `code_execution` with image inputs — only Gemini 3 Flash Preview does.

## Change
**File**: `supabase/functions/run-figure-extraction/index.ts`, line 225

Change the model URL from:
```
gemini-2.5-flash:generateContent
```
to:
```
gemini-3-flash-preview:generateContent
```

Single line change. Everything else (prompt, code_execution tool, image inline_data, upload logic) stays the same.

