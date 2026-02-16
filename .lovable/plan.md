

## Fix Figure Extraction: OpenAI Responses API with Direct PDF Input

### Why Responses API over Chat Completions

The OpenAI Responses API (launched March 2025) natively accepts PDF files as input -- both text and page images are extracted automatically. This is better than Chat Completions for this task because:

- No need to convert PDF pages to images first
- OpenAI handles text + visual extraction from the PDF internally
- Supports inline base64 PDF (no separate file upload step needed)
- Same GPT-4o vision capabilities, purpose-built for document analysis

### Current Bugs Being Fixed

1. **Crash bug (line 111)**: `btoa(String.fromCharCode(...pdfBytes))` causes stack overflow for PDFs larger than ~50KB
2. **Wrong API format**: Current code uses `image_url` content block with `application/pdf` MIME type, which Chat Completions does not support for PDFs
3. **Per-figure API calls**: Current code makes one API call per figure -- wasteful when we can ask for all bounding boxes in a single request

### Plan

#### 1. Rewrite `supabase/functions/run-figure-extraction/index.ts`

Switch from Chat Completions to the Responses API:

- **Endpoint**: `POST https://api.openai.com/v1/responses` (instead of `/v1/chat/completions`)
- **Input format**: Use `input_file` content part with inline base64:
  ```
  {
    "type": "input_file",
    "file_data": "data:application/pdf;base64,<BASE64>",
    "filename": "paper.pdf"
  }
  ```
- **Single request**: Send the full PDF once with ALL figure captions, ask GPT-4o to return bounding boxes for every figure in one JSON array
- **Fix base64**: Replace spread operator with chunked encoding (8192-byte batches)
- **Response format**: Parse `response.output_text` (Responses API format) instead of `choices[0].message.content`
- **Keep**: Existing fallback behavior (no bounding box if OpenAI fails), structured_papers update logic

#### 2. Update `src/types/structured-paper.ts`

Add `bounding_box` to the `Figure` interface:

```typescript
bounding_box?: {
  x: number;      // fraction 0-1, top-left x
  y: number;      // fraction 0-1, top-left y
  width: number;  // fraction 0-1
  height: number; // fraction 0-1
};
```

#### 3. Create `src/hooks/usePaperPdf.ts`

Hook for client-side PDF rendering:
- Downloads PDF from storage once per paper
- Loads with `pdfjs-dist`, caches document instance
- Exposes `renderPage(pageNumber, scale)` returning a canvas

#### 4. Create `src/components/paper/FigureRenderer.tsx`

Reusable component:
- Takes a `Figure` object and `storagePath`
- Uses `usePaperPdf` to render the figure's page
- If `bounding_box` exists: canvas cropping to show only the figure region
- If missing: shows full page as fallback
- Displays caption, description, key findings below

#### 5. No changes to orchestrate-pipeline

Figure extraction stays as a parallel step alongside chunking (already non-blocking via `Promise.allSettled`).

### Technical Details: Edge Function

```text
Endpoint change:
  OLD: POST https://api.openai.com/v1/chat/completions
  NEW: POST https://api.openai.com/v1/responses

Request body change:
  OLD: { model, messages: [{ role, content: [{ type: "image_url", ... }] }] }
  NEW: { model: "gpt-4o", input: [{ role: "user", content: [
           { type: "input_text", text: "<prompt with all figure captions>" },
           { type: "input_file", file_data: "data:application/pdf;base64,...", filename: "paper.pdf" }
         ]}]}

Response parsing change:
  OLD: data.choices[0].message.content
  NEW: data.output_text (or data.output[0].content[0].text)

Base64 fix:
  OLD: btoa(String.fromCharCode(...pdfBytes))  // crashes on >50KB
  NEW: chunked loop processing 8192 bytes at a time
```

### Dependencies to Add

- `pdfjs-dist` -- for client-side PDF page rendering in FigureRenderer

### Files Summary

| File | Action |
|------|--------|
| `supabase/functions/run-figure-extraction/index.ts` | Rewrite (Responses API + base64 fix) |
| `src/types/structured-paper.ts` | Edit (add bounding_box to Figure) |
| `src/hooks/usePaperPdf.ts` | Create |
| `src/components/paper/FigureRenderer.tsx` | Create |

