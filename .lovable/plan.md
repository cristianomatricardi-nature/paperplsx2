

# Fix: Add `policy_view` to Cache Content Type Constraint

## Problem

The `generated_content_cache` table has a check constraint that only allows `content_type` values of `'module'` or `'summary'`. The `generate-policy-view` function tries to insert with `content_type = 'policy_view'`, which is rejected by the constraint. This means:

1. Policy view content is never cached
2. Every request triggers a full AI regeneration (slow, expensive)
3. Repeated calls can timeout, causing the "Failed to send a request to the Edge Function" error

The logs confirm this: `new row for relation "generated_content_cache" violates check constraint "generated_content_cache_content_type_check"`.

## Fix

### Database migration

Update the check constraint to include `'policy_view'` (and while we're at it, any other content types that may be needed like `'educator_view'`, `'funder_view'`):

```sql
ALTER TABLE generated_content_cache 
  DROP CONSTRAINT generated_content_cache_content_type_check;

ALTER TABLE generated_content_cache 
  ADD CONSTRAINT generated_content_cache_content_type_check 
  CHECK (content_type = ANY (ARRAY['module', 'summary', 'policy_view', 'educator_view', 'funder_view']));
```

### No code changes needed

The edge function code is already correct — it was already fixed (temperature removed) and deploys are up to date. The only issue is the database constraint blocking caching.

