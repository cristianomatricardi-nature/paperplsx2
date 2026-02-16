

## Lighter Left Column and Sans-Serif Font Overhaul

### Problem
The left content column has a gray background (`--background: 0 0% 97%`) instead of near-white. The typography uses serif fonts (`Playfair Display`) for headings, but the reference design uses clean sans-serif fonts throughout.

---

### 1. Lighten the Background Color

**File: `src/index.css`**

Change `--background` from `0 0% 97%` to `0 0% 100%` (pure white). This makes the left content area white while the sidebar's `bg-muted/30` remains visibly distinct as a slightly darker column.

---

### 2. Switch All Serif References to Sans-Serif

Multiple files currently use `font-serif` (Playfair Display) for headings. The reference shows all text in a clean sans-serif. Changes needed:

**File: `src/components/paper-view/PaperHeader.tsx`**
- Line 60: Change `font-serif` to `font-sans` on the paper title `<h1>`

**File: `src/components/paper-view/PersonalizedSummaryCard.tsx`**
- Line 84: Change `font-serif` to `font-sans` on "Key Insights" heading

**File: `src/components/paper-view/ModuleAccordionList.tsx`**
- Line 52: Change `font-serif` to `font-sans` on section headers ("Core Research", "Satellite Modules")

**File: `src/components/paper-view/PaperSidebar.tsx`**
- Line 247: Change `font-serif` to `font-sans` on "Projected Impact Analysis" heading

---

### 3. Match the Reference Header Layout

**File: `src/components/paper-view/PaperHeader.tsx`**

Looking at the reference more closely:
- "Article" label + "Open access" badge + date are on a small meta line above the title
- The title is bold sans-serif
- Below the title: "7 Authors" as a rounded chip with a dropdown chevron, and "Download PDF" button on the right
- The "viewing now" counter moves to the top bar area

Add an "Article" text label before the badges row, and style the authors as a compact chip button (already partially done but ensure it matches).

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/index.css` | `--background: 0 0% 100%` (white) |
| `PaperHeader.tsx` | `font-serif` to `font-sans` on title |
| `PersonalizedSummaryCard.tsx` | `font-serif` to `font-sans` on heading |
| `ModuleAccordionList.tsx` | `font-serif` to `font-sans` on section headers |
| `PaperSidebar.tsx` | `font-serif` to `font-sans` on impact heading |

Minimal className-level changes only. No logic changes.

