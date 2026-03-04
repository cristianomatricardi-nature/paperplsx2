

# Fix: Infographic Generation Failing at Step 2 (Image)

## Root Cause

The logs show clearly:

```
Invalid URL format: https://xgqfevxrifleenymsfhv.supabase.co/storage/v1/object/public/paper-figures//SN_logo_RGB (2).jpg
```

The `SN_LOGO_URL` constant on line 9-10 has two problems:
1. **Double slash** in the path: `.../paper-figures//SN_logo_RGB...`
2. **Spaces in filename**: `SN_logo_RGB (2).jpg` — Gemini's API rejects URLs with unencoded spaces

When this URL is passed to `google/gemini-3-pro-image-preview` as an `image_url`, the API returns a 400 error, which crashes Step 2.

## Fix

### `supabase/functions/generate-policy-infographic/index.ts`

**Line 9-10**: Fix the `SN_LOGO_URL` constant — remove the double slash and URL-encode the spaces:

```typescript
const SN_LOGO_URL =
  "https://xgqfevxrifleenymsfhv.supabase.co/storage/v1/object/public/paper-figures/SN_logo_RGB%20(2).jpg";
```

Alternatively, if the logo file doesn't exist at that path, we should rename the uploaded file to remove spaces (e.g., `SN_logo_RGB.jpg`). But the URL fix alone should resolve the 400 error.

### Redeploy

Redeploy `generate-policy-infographic` after the fix.

### Files changed
1. `supabase/functions/generate-policy-infographic/index.ts` — fix logo URL (1 line)

