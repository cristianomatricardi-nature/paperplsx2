

# Fix: Figure Extraction Boot Failure + Audio Key

## Issue 1: `run-figure-extraction` crashes — wrong import

`pdfjs-serverless@0.5.1` does not export `getDocument` as a named export. The library's API differs from standard `pdfjs-dist`. Looking at how `run-parser` already uses it successfully will show the correct import pattern.

**Fix**: Rewrite the PDF-to-PNG rendering in `run-figure-extraction/index.ts` to use the correct `pdfjs-serverless` API (likely a default export or different function name). Since `run-parser` already works with this library, mirror its import pattern.

If `pdfjs-serverless` cannot render pages to images (it may only support text extraction in Deno), the fallback is to send the raw PDF bytes directly to Gemini as `application/pdf` inline_data — Gemini does accept PDFs natively despite earlier assumptions. This would simplify the pipeline significantly.

**File**: `supabase/functions/run-figure-extraction/index.ts` — fix import on line 2 and the page rendering logic.

## Issue 2: ElevenLabs 401 — invalid API key

The `ELEVENLABS_API_KEY` connector secret has an invalid key. The user needs to reconnect the ElevenLabs connector with a valid API key.

**Action**: Reconnect the ElevenLabs connector to update the API key.

## Issue 3: Figures not in modules

This is a downstream effect of Issue 1. Once figure extraction works and populates `image_url` on figures, `ModuleContentRenderer` and `FigurePlaceholder` will render them. No code changes needed here — the components already handle `image_url` when present.

