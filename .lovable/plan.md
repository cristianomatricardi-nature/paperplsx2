

## Add Sidebar to Public Paper View

### What Changes

Add the `PaperSidebar` component to `PublicPaperViewPage.tsx` in read-only mode, matching the layout used in `PaperViewPage.tsx`.

### Details

**File: `src/pages/PublicPaperViewPage.tsx`**

1. Import `PaperSidebar` and add sidebar state (`sidebarOpen`, default `true`)
2. Switch from the current single-column layout to the same 12-column grid layout used in `PaperViewPage`:
   - Main content: `col-span-12 lg:col-span-8`
   - Sidebar: renders `PaperSidebar` on the right
3. Pass sidebar props in read-only mode:
   - `isOwner={false}` -- no author controls
   - `authorsMode={false}` -- no editing features
   - `authorScores={null}` -- no author self-assessment
   - `onAuthorsModeChange` / `onAuthorScoresChange` as no-ops
4. When `?embed=true`, conditionally hide or keep the sidebar (hide it for iframe embeds to save space, show it for the regular public link)
5. Add a sidebar toggle button in a minimal top bar (only visible on the non-embed public view)

### Result

- `/paper/:paperId/public` -- full paper view with sidebar (read-only, no owner tools)
- `/paper/:paperId/public?embed=true` -- compact view without sidebar for iframe embedding

| File | Change |
|------|--------|
| `src/pages/PublicPaperViewPage.tsx` | Add PaperSidebar, grid layout, toggle button, embed-aware visibility |

