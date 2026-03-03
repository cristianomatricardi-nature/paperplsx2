

# Hide Buttons + Figure Image Storage Architecture

## 1. Hide "Copy Link" and "Authors Mode" buttons

In `src/components/paper-view/PaperHeader.tsx`, remove (or conditionally hide) the two buttons in the actions row:
- The "Authors Mode" button (lines ~113-125)
- The "Copy Link" button (lines ~127-137)
- Also remove the "Authors Mode explainer banner" block at the bottom (lines ~148-163)
- Clean up unused props (`isOwner`, `authorsMode`, `onAuthorsModeChange`, `paperId`) and imports (`Pencil`, `Link2`)

---

## 2. Your question about figures vs infographics

You're right to notice the difference. Here's how the two flows work today:

```text
CURRENT FIGURE EXTRACTION (client-side rendering):
  PDF → OpenAI detects bounding boxes (coordinates only)
      → stored as {x, y, width, height} in structured_papers.figures
      → client downloads entire PDF via PDF.js
      → crops the region in a <canvas> in the browser
      → NO actual image file is ever saved

INFOGRAPHIC GENERATION (server-side image):
  Module data → Gemini 3 Pro generates a PNG image
      → base64 decoded → uploaded to "paper-figures" storage bucket
      → public URL returned → rendered as a simple <img src="...">
```

**Why figures didn't store images originally**: OpenAI's vision API returns text (coordinates), not images. It can't "crop and return" a region of a PDF. So the workaround was: get coordinates from AI, then crop client-side with PDF.js.

**Can we do the same as infographics?** Yes — but not by asking Gemini to "extract" the figure. Instead, we can **crop server-side** in the edge function (same way the infographic function already renders PDF page 1 with `pdfjs-serverless`). The flow would be:

```text
NEW FIGURE EXTRACTION (server-side crop + storage):
  PDF → OpenAI detects bounding boxes (same as today)
      → edge function renders each page with pdfjs-serverless
      → crops each figure region using OffscreenCanvas
      → uploads cropped PNG to "paper-figures" bucket
      → stores public URL in structured_papers.figures[].image_url
      → client renders simple <img src="..."> (no PDF.js needed)
```

This is a significant improvement: faster page loads (no full PDF download), simpler client code, and figures work even without PDF.js.

### Implementation (future, not in this change)

In `supabase/functions/run-figure-extraction/index.ts`:
- After getting bounding boxes from OpenAI (line 256), add a server-side crop loop
- For each figure with a bounding box, render the page with `pdfjs-serverless`, crop using `OffscreenCanvas`, convert to PNG, upload to `paper-figures` bucket
- Store the public URL in each figure's `image_url` field
- The existing `FigurePlaceholder` already checks `figure.image_url` and renders `<img>` when present

This change would only affect the edge function — the frontend already supports `image_url` rendering.

**Do you want me to implement both changes (hide buttons + server-side figure cropping) or just the button hiding for now?**

