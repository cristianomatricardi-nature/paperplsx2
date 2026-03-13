

# Move Paper Library to Hub Page

## What Changes

Move the `PaperLibrary` component from `ResearcherHomePage` to `HubPage`, adding it as a fourth card ("My Library") that expands inline or navigates to show the tabbed library (My Papers + Paper++ Collection).

## Approach

### `src/pages/HubPage.tsx`
- Import `PaperLibrary` component
- Add a new full-width card below the Paper++ Generator card (before the Manage Account / Digital Lab row) titled "My Library" with a `Library` icon
- Unlike the other cards which navigate away, this one uses a collapsible/expandable pattern: clicking it toggles showing the `PaperLibrary` component inline below the card (using state `libraryOpen`)
- Pass `userId={user.id}` and `refreshKey={0}` (static, since uploads happen inside the component)

### `src/pages/ResearcherHomePage.tsx`
- Remove `PaperLibrary` import and rendering — the researcher home page becomes purely the Paper++ Generator (upload section only)
- Remove the `refreshKey` state and `handlePaperAdded` callback since `PaperLibrary` managed its own fetching

### Layout on Hub Page

```text
┌─────────────────────────────────────┐
│  Paper++ Generator          →       │  (navigates to /researcher-home)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  📚 My Library              ▼       │  (toggles open/close)
│  ┌─────────────────────────────────┐│
│  │ [My Papers] [Paper++ Collection]││
│  │ ...cards...                     ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
┌────────────────┐ ┌─────────────────┐
│ Manage Account │ │  Digital Lab    │
└────────────────┘ └─────────────────┘
```

The library card uses the same rounded-2xl styling as other hub cards. When collapsed, it shows "My Library" with paper count badge and a chevron. When expanded, the `PaperLibrary` component renders inside with full tab UI and upload dropzone.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/HubPage.tsx` | Add `PaperLibrary` in collapsible card section |
| `src/pages/ResearcherHomePage.tsx` | Remove `PaperLibrary`, keep only `UploadSection` |

