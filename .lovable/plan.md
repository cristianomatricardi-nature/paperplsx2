

## Narrow the Content Area

### Change

**File: `src/pages/PaperViewPage.tsx`**

Add a `max-w-3xl` constraint to the left content column's inner content so the text doesn't stretch the full 8-column width. This keeps the reading area comfortable and centered within the left column.

On line 132, wrap the content inside the left column div with an additional inner container:

```tsx
<div className={sidebarOpen ? 'col-span-12 lg:col-span-8 px-4 md:px-8 py-8' : 'flex-1 px-4 md:px-8 py-8'}>
  <div className="max-w-3xl mx-auto">
    <PaperHeader ... />
    {/* Summary, Modules, Figures -- all inside this narrower wrapper */}
  </div>
</div>
```

This constrains the reading content to ~768px max width and centers it within the left column, matching the narrower, more focused layout from the reference.

| File | Change |
|------|--------|
| `PaperViewPage.tsx` | Add `max-w-3xl mx-auto` inner wrapper around all left-column content |

Single line-level change, no logic modifications.
