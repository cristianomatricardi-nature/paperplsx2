

# Fix Field Name Mismatches — Impact Analysis & Implementation

## Summary

The proposed changes are **completely safe**. They only modify internal rendering logic within 4 leaf components. No shared types, imports, component APIs, or other files are affected.

## Why It's Safe (Full Trace)

The data flows like this:

```text
Backend (edge function) returns JSONB with "page_refs"
  -> stored in generated_content_cache.content (untyped JSONB)
  -> fetched by ModuleAccordion as `unknown`
  -> passed to ModuleContentRenderer as `unknown`
  -> cast and forwarded to ClaimCard / ProtocolStep / etc. as untyped objects
  -> each renderer reads fields from its own local interface
```

No shared TypeScript interface (like `Claim` in `structured-paper.ts`) is used by any renderer. Each renderer has its own private interface with optional fields. Adding `page_refs?: number[]` to a private interface has zero effect outside that file.

## Changes (4 files only)

### 1. ClaimCard.tsx
- Add `page_refs?: number[]` to local interface
- Alias: `const pages = claim.page_numbers ?? claim.page_refs ?? []`
- Fix `statistics` to handle both `string` and `{name, value}` shapes

### 2. ProtocolStep.tsx
- Add `page_refs?: number[]` to local interface
- Alias: `const pages = step.page_numbers ?? step.page_refs ?? []`

### 3. NegativeResultCard.tsx
- Add `page_refs?: number[]` to local interface
- Alias: `const pages = result.page_numbers ?? result.page_refs ?? []`

### 4. ActionCard.tsx
- Add `page_refs?: number[]` to local interface
- Alias: `const pages = action.page_numbers ?? action.page_refs ?? []`

### Files NOT changed (verified safe)
- ModuleContentRenderer.tsx — passes `unknown`, no field inspection
- ModuleAccordion.tsx — passes opaque content, no field inspection
- ModuleAccordionList.tsx — manages cache keys only
- GenericFallback.tsx — recursive renderer, field-agnostic
- PageReference.tsx — takes `{ page: number }`, leaf component
- FigurePlaceholder.tsx — uses `Figure` type, unrelated
- structured-paper.ts — types not imported by any renderer
- supabase/types.ts — auto-generated, not touched

