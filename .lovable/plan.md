

## Fix Persona Selection Not Appearing + Dropdown Filtering

### Problem

Two related issues:

1. **Persona selection never shows**: The `PersonaSelectionStep` only renders inside `UploadSection` during a fresh upload when the pipeline finishes in real-time. For papers already in the library (shown via `PaperCard`), clicking "View Paper++" navigates directly to the paper view -- no persona selection step ever appears.

2. **Only PhD/Postdoc in dropdown**: All existing papers have `selected_personas` defaulting to `["phd_postdoc"]`, so the persona dropdown on the paper view correctly shows only that one option. But since users never got to choose personas, this feels broken.

### Solution

Add a persona selection gate on the `PaperViewPage` itself. When a user opens a completed paper that still has the default single persona, show the persona selection UI before showing the paper content. This handles both fresh uploads and existing papers.

### Changes

**File: `src/pages/PaperViewPage.tsx`**
- After loading the paper, check if `selected_personas` is still the default (`["phd_postdoc"]` with length 1) and no module content has been generated yet
- If so, show the `PersonaSelectionStep` component as a full-page overlay/card instead of the paper content
- On confirm, save the selected personas to DB, update local state, and show the paper

**File: `src/components/researcher-home/PaperCard.tsx`**
- No changes needed -- "View Paper++" navigates to paper view where the gate will catch unselected papers

**File: `src/pages/PaperViewPage.tsx` (persona dropdown)**
- When `allowedPersonas` is undefined or empty, show all personas (remove the filter so the dropdown is not artificially restricted)
- Only filter when `selected_personas` contains more than one entry (meaning the user actively chose)

### Technical Details

| File | Change |
|------|--------|
| `src/pages/PaperViewPage.tsx` | Add persona selection gate: if paper has default personas and user is owner, show `PersonaSelectionStep` before paper content. After selection, save to DB and proceed. |

The gate logic:
- Show selection when: `isOwner && paper.selected_personas` is the untouched default `["phd_postdoc"]`
- Add a `personasConfirmed` state flag so the gate only shows once per session
- After confirming, update DB row + local `allowedPersonas` state and render the paper normally

This approach means:
- Existing papers get the persona selection on first open
- Fresh uploads still get it in the upload flow (no regression)
- The dropdown then correctly shows all chosen personas

