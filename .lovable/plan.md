

# Fix Heatmap Accuracy + Missing Activity Events

## Issues Found

### 1. Heatmap coordinates are wrong
The tracker records `x_pct` and `y_pct` as percentage of the **browser viewport** (`clientX / window.innerWidth`). But this only captures the visible portion — it does not account for **scroll position**. If a user scrolls halfway down a page and dwells there, the y coordinate is recorded as 50% (middle of viewport), but the actual page position might be 70% down the document. The heatmap overlay positions dots relative to the iframe content, so they appear in the wrong place.

**Fix**: Record position relative to the **full document** using `pageX/pageY` and `document.documentElement.scrollHeight/scrollWidth` instead of `clientX/clientY` and `window.innerWidth/innerHeight`. Also store `scroll_y` so the heatmap can account for scroll depth.

### 2. `replication_used` event never fires
The `useEffect` in `ReplicationAssistantPage.tsx` has `deps: []` (empty array), but the guard checks `if (!numericId || !user?.id) return`. The `user` from `useAuth()` is typically `null` on the first render and only populates after the auth state resolves. Since the effect only runs once (empty deps), it exits early and never re-runs.

The `AnalyticalPipelinePage.tsx` works around this by calling `supabase.auth.getSession()` inside the effect — that pattern actually works. `ReplicationAssistantPage` does not.

### 3. `figure_viewed` and `paper_uploaded` events exist in code but have 0 rows
The `figure_viewed` code looks correct. The `paper_uploaded` code also looks correct. These likely just haven't been triggered yet (no new uploads or figure clicks since the fix). Not a code bug.

## Changes

### `src/hooks/useHeatmapTracker.ts`
- Change from `clientX/clientY` (viewport-relative) to `pageX/pageY` (document-relative)
- Calculate percentages against `document.documentElement.scrollWidth` and `document.documentElement.scrollHeight` instead of `window.innerWidth/innerHeight`
- This makes coordinates match the full page layout, which is what the iframe renders

### `src/pages/ReplicationAssistantPage.tsx`
- Use the same `supabase.auth.getSession()` pattern as `AnalyticalPipelinePage` so the event fires even when `useAuth()` hasn't resolved yet on mount

### `src/components/admin/HeatmapTab.tsx`
- Add `figure_viewed` and `paper_uploaded` counts to the admin dashboard summary (they exist in the edge function query but aren't surfaced in the UI)

### `supabase/functions/admin-dashboard/index.ts`
- Add `figure_viewed` and `paper_uploaded` to the per-user event tracking and summary percentages

### `src/pages/AdminPage.tsx`
- Add stat cards and table columns for `figure_viewed` and `paper_uploaded`

