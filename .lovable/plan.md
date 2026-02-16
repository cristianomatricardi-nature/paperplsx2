

## Move Authors Mode Toggle to Paper Header

### What Changes

1. **Remove** the Authors Mode toggle card from `PaperSidebar.tsx` (lines 188-203).

2. **Add** an "Authors Mode" toggle button in `PaperHeader.tsx`, placed next to the "Download PDF" button in the actions row. It will be a simple button (not a switch) -- something like a `Button` with a `Pencil` icon labeled "Authors Mode" that toggles the mode on/off. When active, it gets a filled/highlighted style; when inactive, it looks like the outline Download PDF button.

3. **Pass new props** to `PaperHeader`:
   - `isOwner: boolean` -- controls visibility of the button
   - `authorsMode: boolean` -- controls active/inactive styling
   - `onAuthorsModeChange: (v: boolean) => void` -- toggle callback

4. **Update `PaperViewPage.tsx`** to pass `isOwner`, `authorsMode`, and `onAuthorsModeChange` to `PaperHeader`.

### Visual Result

The actions row in the header will look like:

```
[Download PDF]  [Authors Mode]          12 viewing now
```

- "Authors Mode" button only visible to the paper owner
- When active: filled primary style; when inactive: outline style matching Download PDF
- Clicking toggles `authorsMode` on/off

### Technical Details

| File | Change |
|------|--------|
| `src/components/paper-view/PaperHeader.tsx` | Add `isOwner`, `authorsMode`, `onAuthorsModeChange` props; render toggle button in actions row |
| `src/components/paper-view/PaperSidebar.tsx` | Remove the mode toggle card (lines 188-203) |
| `src/pages/PaperViewPage.tsx` | Pass `isOwner`, `authorsMode`, `setAuthorsMode` to `PaperHeader` |

