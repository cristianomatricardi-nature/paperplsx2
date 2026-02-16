

## Visual Redesign: Paper++ View

Comparing the current UI with the reference screenshot, the following design changes are needed to achieve the softer, more spacious, card-based layout.

---

### 1. Increase Global Border Radius

**File: `src/index.css`**

Change `--radius` from `0.25rem` to `0.75rem`. This affects all shadcn components (cards, buttons, inputs, badges, etc.) making everything more rounded throughout the app.

---

### 2. Redesign the Sidebar as Separate Cards

**File: `src/components/paper-view/PaperSidebar.tsx`**

Currently the sidebar is one tall stacked panel with internal borders. The reference shows each section (Article/Authors toggle, Strategic Insights, Community Engagement, Multidimensional Assessment) as its own standalone rounded card with shadow and spacing between them.

- Replace the single `border bg-secondary/30` wrapper with a `space-y-4` container
- Wrap each collapsible section (insights, community, assessment) and the mode toggle in its own `rounded-xl border bg-card shadow-sm` card
- Move the Article/Authors mode toggle to the top as its own small card
- Remove the "Collapse" bar at the top; keep collapse behavior via the existing top-bar button
- Add subtle descriptions under each card title (e.g., "AI-powered insights" under Strategic Insights) matching the reference

---

### 3. Softer Module Accordion Cards

**File: `src/components/paper-view/ModuleAccordion.tsx`**

- Change `rounded-md` to `rounded-xl` for softer corners
- Add `shadow-sm` for subtle elevation matching the reference
- Increase vertical padding slightly in the trigger area

---

### 4. Softer Personalized Summary Card

**File: `src/components/paper-view/PersonalizedSummaryCard.tsx`**

- The Card already inherits the global radius, but explicitly ensure it renders with rounded-xl styling and a subtle shadow

---

### 5. Module Section Headers Spacing

**File: `src/components/paper-view/ModuleAccordionList.tsx`**

- Increase gap between module cards from `space-y-2` to `space-y-3`
- Add a colored dot before section titles ("Core Research", "Satellite Modules") matching the reference style, instead of the current border-left approach

---

### 6. Paper Header Refinements

**File: `src/components/paper-view/PaperHeader.tsx`**

- Wrap author count in a rounded pill/button shape (the reference shows "7 Authors" in a rounded outlined chip)
- Increase bottom margin for better breathing room

---

### 7. Page-Level Spacing

**File: `src/pages/PaperViewPage.tsx`**

- Increase gap between grid columns from `gap-6` to `gap-8`
- Increase vertical padding for more whitespace

---

### Technical Details

All changes are CSS/className-level adjustments -- no logic changes, no new dependencies. The global `--radius` bump in `index.css` is the highest-impact single change, instantly rounding all shadcn primitives. Component-specific tweaks then fine-tune shadows, spacing, and card separation to match the reference aesthetic.

Files to modify:
- `src/index.css` (1 line: radius value)
- `src/components/paper-view/PaperSidebar.tsx` (restructure into separate cards)
- `src/components/paper-view/ModuleAccordion.tsx` (rounded-xl, shadow)
- `src/components/paper-view/PersonalizedSummaryCard.tsx` (rounded-xl)
- `src/components/paper-view/ModuleAccordionList.tsx` (spacing, dot headers)
- `src/components/paper-view/PaperHeader.tsx` (author chip styling)
- `src/pages/PaperViewPage.tsx` (spacing tweaks)

