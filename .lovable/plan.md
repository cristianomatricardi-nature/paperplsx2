

# Fix: Activity Tracking and Heatmap Inserts Never Execute

## Root Cause (confirmed via DB query + network logs)

Both `user_activity_events` and `user_heatmap_events` tables have **0 rows**. No POST requests to these tables appear in network logs.

In Supabase JS v2, `PostgrestBuilder` is a thenable — the HTTP request only fires when the promise chain is consumed (via `await`, `.then()`, etc.). Calling `.insert({...}).select()` just returns another builder object but **never sends the request** unless something calls `.then()` on it.

The previous "fix" added `.select()` but that's insufficient. We need `.then()` or `await`.

## Fix

Append `.then(() => {})` (or use `void ... .then(...)`) to every fire-and-forget insert. This is the minimal change to trigger execution without blocking.

### Files to change

| File | Insert calls to fix |
|------|-------------------|
| `src/pages/PaperViewPage.tsx` | Lines 66-70 (`protocol_opened`), lines 139-143 (`persona_changed`) |
| `src/pages/ReplicationAssistantPage.tsx` | Lines 50-54 (`replication_used`) |
| `src/pages/AnalyticalPipelinePage.tsx` | Lines 45-49 (`analysis_used`) |
| `src/components/researcher-home/UploadSection.tsx` | Lines 124-128 (`paper_uploaded`) |
| `src/components/paper-view/renderers/FigurePlaceholder.tsx` | Lines 20-24 (`figure_viewed`) |
| `src/hooks/useHeatmapTracker.ts` | Line 79 (heatmap batch insert) |

### Pattern

```typescript
// Before (never sends):
supabase.from('user_activity_events').insert({...}).select();

// After (sends):
supabase.from('user_activity_events').insert({...}).select().then(() => {});
```

For the heatmap tracker (line 79):
```typescript
// Before:
supabase.from('user_heatmap_events' as any).insert(events).select();

// After:
supabase.from('user_heatmap_events' as any).insert(events).select().then(() => {});
```

No database or RLS changes needed — the schema and policies are correct. The requests simply never execute.

