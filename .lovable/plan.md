

## Layout Ratio Fix and Icon Removal

### Problem
The paper view content stretches edge-to-edge across the full screen width, making it hard to read on wide monitors. The reference design shows content constrained to a comfortable max-width centered on the page. Additionally, emoji icons next to module titles and sidebar section titles need to be removed.

---

### 1. Constrain Page Width

**File: `src/pages/PaperViewPage.tsx`**

Wrap the main content area (`px-4 md:px-8 py-8` div, line 130) with a `max-w-7xl mx-auto` container so the content stays centered and doesn't stretch beyond ~1280px on wide screens.

---

### 2. Remove Emoji Icons from Module Accordion Headers

**File: `src/components/paper-view/ModuleAccordion.tsx`**

Remove the icon span on line 76:
```tsx
// Remove this line:
<span className="text-lg">{moduleDefinition.icon}</span>
```

Also remove the "Core" / "Satellite" badge (line 80-82) to clean up the header further -- keeping just the module title text.

---

### 3. Remove Emoji Icons from Sidebar Section Headers

**File: `src/components/paper-view/PaperSidebar.tsx`**

Remove the emoji spans from each collapsible trigger:
- Line 164: Remove `<span>💡</span>`
- Line 187: Remove `<span>👥</span>`  
- Line 219: Remove `<span>📊</span>`

---

### 4. Remove Emoji from Personalized Summary Card Header

**File: `src/components/paper-view/PersonalizedSummaryCard.tsx`**

Remove the persona emoji span on line 85 (the long ternary producing graduation cap, microscope, etc.).

---

### Summary of Changes

| File | Change |
|------|--------|
| `PaperViewPage.tsx` | Add `max-w-7xl mx-auto` wrapper |
| `ModuleAccordion.tsx` | Remove icon span and badge from header |
| `PaperSidebar.tsx` | Remove 3 emoji spans from section triggers |
| `PersonalizedSummaryCard.tsx` | Remove persona emoji from title |

All changes are className/JSX-level -- no logic changes.

