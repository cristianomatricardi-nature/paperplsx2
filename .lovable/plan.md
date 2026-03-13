

# Fix Admin Activity Tracking + Add Heatmap Analytics

## Root Cause: Zero Events

The `user_activity_events` table has **0 rows**. Every insert call across the app is broken because in Supabase JS v2, `supabase.from('table').insert({...})` without `.select()`, `.then()`, or `await` **never sends the HTTP request**. The query builder is lazy — it only executes when the promise is consumed.

All 4 tracking calls have this bug:
- `PaperViewPage.tsx` — `persona_changed` and `protocol_opened`
- `ReplicationAssistantPage.tsx` — `replication_used`
- `AnalyticalPipelinePage.tsx` — `analysis_used`

Additionally, the `admin-dashboard` edge function uses `anonClient.auth.getClaims(token)` which may not exist in the Supabase JS v2 SDK. It should use `anonClient.auth.getUser()` instead to extract the user ID.

## Changes

### 1. Fix all activity event inserts (4 files)

Add `.select()` to every `supabase.from('user_activity_events').insert({...})` call so the request actually fires. Pattern:

```typescript
// Before (never sends):
supabase.from('user_activity_events').insert({ ... });

// After (sends the request):
supabase.from('user_activity_events').insert({ ... }).select();
```

**Files**: `PaperViewPage.tsx` (2 calls), `ReplicationAssistantPage.tsx` (1 call), `AnalyticalPipelinePage.tsx` (1 call)

### 2. Fix admin-dashboard auth — `supabase/functions/admin-dashboard/index.ts`

Replace `getClaims(token)` with `getUser()` which is the standard v2 method. Extract `userId` from `data.user.id`.

### 3. Add more tracking events

Add tracking for additional user interactions:
- **Paper upload** — track in `UploadSection.tsx` after successful upload
- **Summary viewed** — track when the personalized summary card is opened
- **Figure viewed** — track when a figure is clicked/expanded

### 4. Heatmap tracking system

Create a lightweight mouse-position recorder that:
- Stores a new `user_heatmap_events` table with columns: `user_id`, `page_path`, `x_pct` (0-100), `y_pct` (0-100), `viewport_w`, `viewport_h`, `created_at`
- Uses a React hook (`useHeatmapTracker`) that samples mouse position every 2 seconds (throttled) and batches inserts every 30 seconds to minimize DB load
- Only records when mouse is stationary for >500ms (dwelling, not just passing through)
- Admin dashboard gets a new "Heatmaps" tab showing aggregated dot-density visualization per page

### Database migration

```sql
CREATE TABLE public.user_heatmap_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  page_path text NOT NULL,
  x_pct real NOT NULL,
  y_pct real NOT NULL,
  viewport_w integer NOT NULL,
  viewport_h integer NOT NULL,
  dwell_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_heatmap_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own heatmap events"
  ON public.user_heatmap_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all heatmap events"
  ON public.user_heatmap_events FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
```

### Files

| File | Change |
|------|--------|
| `src/pages/PaperViewPage.tsx` | Add `.select()` to 2 insert calls |
| `src/pages/ReplicationAssistantPage.tsx` | Add `.select()` to insert call |
| `src/pages/AnalyticalPipelinePage.tsx` | Add `.select()` to insert call |
| `supabase/functions/admin-dashboard/index.ts` | Replace `getClaims` with `getUser()` |
| `src/hooks/useHeatmapTracker.ts` | New hook: throttled mouse-position recorder with batch inserts |
| `src/App.tsx` | Mount `useHeatmapTracker` globally |
| `src/pages/AdminPage.tsx` | Add "Heatmaps" tab with dot-density visualization |
| DB migration | Create `user_heatmap_events` table with RLS |

