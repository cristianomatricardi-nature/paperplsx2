

## Shareable Public Paper Link

### Goal
Create a public, embeddable URL for any completed paper so authors/publishers can share or embed it on external webpages without requiring login.

### Current State
- `/paper/:paperId` is wrapped in `ProtectedRoute`, requiring authentication
- The database RLS policies already allow SELECT on `papers`, `structured_papers`, `chunks`, and `generated_content_cache` for papers with `status = 'completed'` -- so no backend changes are needed

### What We'll Do

**1. Add a new public route `/paper/:paperId/public`**
- This route renders a new `PublicPaperViewPage` component -- a read-only, streamlined version of the paper view (no Authors Mode, no sidebar toggle, no "Back to researcher home")
- Unauthenticated users can access it freely
- Only shows content if the paper status is `completed`; otherwise shows a "Paper not available" message

**2. Create `PublicPaperViewPage.tsx`**
- Fetches the paper and structured data (same queries as `PaperViewPage`)
- Renders `PaperHeader` (without owner controls), `PersonalizedSummaryCard`, `ModuleAccordionList`, and `FiguresSection` in a clean, embeddable layout
- No navigation bar or sidebar -- just the paper content
- Accepts an optional `?embed=true` query param that removes extra padding/chrome for iframe embedding

**3. Add a "Copy Link" / "Share" button in `PaperHeader`**
- Visible on completed papers
- Copies the public URL (`/paper/:paperId/public`) to the clipboard
- Shows a toast confirmation

**4. Register the route in `App.tsx`**
- Add `/paper/:paperId/public` as an unprotected route (no `ProtectedRoute` wrapper)

### Technical Details

| File | Change |
|------|--------|
| `src/pages/PublicPaperViewPage.tsx` | New file -- read-only public paper view |
| `src/App.tsx` | Add unprotected route `/paper/:paperId/public` |
| `src/components/paper-view/PaperHeader.tsx` | Add share/copy-link button for completed papers |

### Embedding Usage
Publishers can embed the paper using a standard iframe:
```html
<iframe src="https://your-app.lovable.app/paper/42/public?embed=true" 
        width="100%" height="800" frameborder="0"></iframe>
```

The `?embed=true` parameter will strip outer padding and navigation elements for a clean embedded appearance.

