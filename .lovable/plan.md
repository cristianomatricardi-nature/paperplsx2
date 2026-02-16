

## Sidebar Column Redesign and Layout Refinement

### Problem
The current layout places the header spanning the full width above both columns, and the sidebar cards float on a white background. The reference shows the sidebar as a distinct column with a slightly darker background stretching from the top banner to the bottom, with the paper title/header only above the left content column. Sidebar cards also need stronger shadows.

---

### 1. Restructure the Page Layout

**File: `src/pages/PaperViewPage.tsx`**

Change the layout so the 12-column grid starts immediately after the top bar, with:
- The header (`PaperHeader`) placed inside the left column (col-span-8), not above the full grid
- The sidebar column (`col-span-4`) gets a subtle `bg-muted/30` background that stretches full height using `min-h-[calc(100vh-3.5rem)]` and padding, creating the "side column" feel from the reference
- Remove `max-w-7xl mx-auto` from the outer wrapper and instead apply width constraints to just the grid content, so the sidebar background can bleed edge-to-edge on the right

The structure becomes:
```
[top bar - full width]
[  left col (8/12)          |  right col (4/12, bg-muted/30)  ]
[  PaperHeader              |  mode toggle card               ]
[  PersonalizedSummary      |  Strategic Insights card        ]
[  ModuleAccordionList      |  Community card                 ]
[  FiguresSection           |  Assessment card                ]
```

---

### 2. Sidebar Background Column

**File: `src/components/paper-view/PaperSidebar.tsx`**

- In the expanded state, wrap the aside in a container with `bg-muted/30 border-l border-border min-h-full` to create the continuous darker column effect
- Add more padding (`p-5`) inside the sidebar column
- Center the section titles (Strategic Insights, Community Engagement, Multidimensional Assessment) and their subtitles using `text-center` on the trigger content
- Increase card shadow from `shadow-sm` to `shadow-md` for more depth

---

### 3. Collapsed Sidebar Update

**File: `src/components/paper-view/PaperSidebar.tsx`**

The collapsed sidebar already uses `bg-secondary/60` -- update to `bg-muted/30` to match the expanded column background.

---

### Summary of Changes

| File | Change |
|------|--------|
| `PaperViewPage.tsx` | Move PaperHeader inside left column; add bg-muted/30 to right column |
| `PaperSidebar.tsx` | Add background column styling, center titles, increase shadow to shadow-md |

CSS/className-level changes only -- no logic changes.

