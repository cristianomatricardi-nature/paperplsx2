

# Fix: Infographic Generation Step 2 Hanging

## Root Cause Analysis

The edge function logs tell the story clearly:

```text
07:30:38  Boot
07:31:09  Step 0 — policy_relevance_score: 7     (31s)
07:31:23  Step 1 — script generated, findings: 5  (14s)
07:31:24  PDF rendering skipped                   (expected)
          Step 2 — callAI(gemini-3-pro-image-preview) ... HANGS
07:33:58  shutdown (wall-time kill)
```

Step 2 never logs anything — the `callAI` call to `google/gemini-3-pro-image-preview` never returns. Three issues cause this:

1. **Wrong parameter name**: The code passes `{ modalities: ["image", "text"] }` but the OpenAI-compatible API used by the Lovable AI gateway likely expects a different field or does not recognize `modalities` at all, causing undefined behavior.

2. **External image URL hangs Gemini**: The `image_url` content part points to the SN logo via an external HTTPS URL. Gemini must fetch this URL server-side, which may hang or timeout within the AI gateway, causing the entire call to stall.

3. **Wrong response parsing**: `step2Data.choices?.[0]?.message?.images?.[0]?.image_url?.url` — this path does not match the standard OpenAI-compatible response format. Images from Gemini via the gateway are typically returned as base64 inline content parts within `choices[0].message.content` (an array of parts), not in a separate `.images` field.

## Fix Plan

### `supabase/functions/generate-policy-infographic/index.ts`

**Change 1 — Fetch SN logo as base64 before calling Gemini** (around line 362-365):
Instead of passing the external URL, fetch the logo and convert to base64 data URI. This eliminates the external URL fetch issue.

**Change 2 — Fix the API parameters** (line 401-403):
Remove `modalities` from the extras. The Lovable gateway should handle image generation from `gemini-3-pro-image-preview` without needing a separate modalities parameter, or use `response_modalities` if needed.

**Change 3 — Fix response parsing** (line 405):
Parse the response correctly. The gateway likely returns image data as:
- `choices[0].message.content` as an array with `{ type: "image_url", image_url: { url: "data:..." } }` parts, OR
- `choices[0].message.content` as an array with `{ type: "image", image: { url: "data:..." } }` parts

Add fallback parsing that checks multiple possible response formats and logs the actual structure for debugging.

**Change 4 — Add diagnostic logging** (before and after Step 2 call):
Log when Step 2 starts and finishes so we can see timing in logs.

### Detailed code changes

```typescript
// Before Step 2 AI call — fetch logo as base64
let logoBase64: string | null = null;
try {
  const logoRes = await fetch(SN_LOGO_URL);
  if (logoRes.ok) {
    const logoBuf = await logoRes.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(logoBuf)));
    logoBase64 = `data:image/jpeg;base64,${b64}`;
  }
} catch (e) {
  console.warn("[generate-policy-infographic] Logo fetch failed:", e);
}

// Build content parts with inline base64 logo
const contentParts: any[] = [
  { type: "text", text: imagePrompt },
];
if (logoBase64) {
  contentParts.push({ type: "image_url", image_url: { url: logoBase64 } });
}

console.log("[generate-policy-infographic] Step 2 — calling image model...");

// Call without 'modalities' extra — just the model and messages
const step2Data = await callAI(lovableApiKey, "google/gemini-3-pro-image-preview", [
  { role: "user", content: contentParts },
], {});

console.log("[generate-policy-infographic] Step 2 — response keys:", 
  JSON.stringify(Object.keys(step2Data?.choices?.[0]?.message ?? {})));

// Parse image from response — try multiple formats
let imageData: string | null = null;
const msg = step2Data.choices?.[0]?.message;
// Format 1: .images array
imageData = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
// Format 2: .content array with image parts
if (!imageData && Array.isArray(msg?.content)) {
  const imgPart = msg.content.find((p: any) => 
    p.type === "image_url" || p.type === "image"
  );
  imageData = imgPart?.image_url?.url ?? imgPart?.image?.url ?? imgPart?.url;
}
// Format 3: inline_data
if (!imageData && Array.isArray(msg?.content)) {
  const inlinePart = msg.content.find((p: any) => p.inline_data);
  if (inlinePart?.inline_data) {
    imageData = `data:${inlinePart.inline_data.mime_type};base64,${inlinePart.inline_data.data}`;
  }
}
```

### Files changed
1. `supabase/functions/generate-policy-infographic/index.ts` — Fix logo to base64, remove `modalities` parameter, fix response parsing, add logging

### Redeploy
Redeploy `generate-policy-infographic` after changes.

