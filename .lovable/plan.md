

## Authors Mode: Explainer Banner + Visual UX Shift

### What Changes

**1. Add an explainer banner below the Authors Mode button (`PaperHeader.tsx`)**

When `authorsMode` is active, render a new info box directly below the actions row with:
- A brief explanation of what Authors Mode enables:
  - "You are in Authors Mode. You can edit and enrich AI-generated module content, link code repositories and datasets, add corrections or context, and provide self-assessment scores -- making your paper more transparent and reproducible for readers."
- A small "Exit Authors Mode" text button at the end for quick toggling back

**2. Visual UX differentiation when Authors Mode is active**

Apply a subtle visual shift to the entire `<header>` block in `PaperHeader.tsx`:
- Add a left border accent (e.g., 3px solid primary/muted color) to signal editing context
- Slightly desaturate the background with a faint warm tint (e.g., `bg-muted/30` or similar)
- The banner itself uses a soft bordered card style with an icon (Pencil or Info)

**3. Also apply a global visual cue on the main content wrapper (`PaperViewPage.tsx`)**

When `authorsMode` is true, add a subtle top-border or background tint to the main content `<div>` so the entire page feels like a distinct editing environment (not just the header).

### Files Changed

| File | Change |
|------|--------|
| `src/components/paper-view/PaperHeader.tsx` | Add conditional explainer banner below actions row when `authorsMode` is true; add left-border accent + background tint to `<header>` when active |
| `src/pages/PaperViewPage.tsx` | Add subtle background/border class to main content div when `authorsMode` is true |

No new files, no database changes, no edge function changes.

