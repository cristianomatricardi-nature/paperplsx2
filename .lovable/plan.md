

## Redesign Claim Cards: Compact and Clean

### Problems
1. **Cards are too tall** -- each card shows the statement, evidence, statistics, figure refs, method refs, and page refs as separate stacked sections, making them very tall.
2. **Too many badges/buttons are distracting** -- figure refs (with emoji), method refs (with emoji), page refs, and the strength badge all compete for attention and clutter the card.

### Solution: Compact, scannable claim cards

**Redesign `ClaimCard.tsx`** with these changes:

| Current | New |
|---------|-----|
| Strength badge as a standalone row | Subtle colored dot + strength label inline with the statement |
| Evidence as a full paragraph | Evidence trimmed to 2 lines with expand on hover/click |
| Statistics as separate badge row | Inline with evidence as subtle mono text |
| Figure refs as emoji buttons (separate row) | Collapsed into a single "refs" line: `Fig 2, 3 -- Method 1 -- p. 2, 3` |
| Method refs as separate emoji buttons | Merged into the same refs line above |
| Page refs as separate row | Merged into refs line |
| 5 distinct visual sections | 3 sections max: header, evidence, refs |

**Visual structure of new card:**

```text
+---------------------------------------+
| * strong  Claim statement text here   |
|           that can wrap to two lines  |
|                                       |
| Evidence text kept to 2-3 lines max  |
| with key stats inline like p<0.001   |
|                                       |
| Fig 2, 3  |  Method 1  |  p. 2, 3   |
+---------------------------------------+
```

The left border color still indicates strength (green/blue/yellow/gray). No emoji icons. References consolidated into one compact footer line with subtle separators.

### Technical details

**File: `src/components/paper-view/renderers/ClaimCard.tsx`**

- Remove the `Badge` import and standalone badge row
- Replace with a small colored dot (`w-2 h-2 rounded-full`) next to strength text, inline with the claim statement
- Reduce padding from `p-4` to `p-3`
- Clamp evidence text to 3 lines using `line-clamp-3`
- Merge figure refs, method refs, and page refs into one `<div>` footer row separated by a middle dot or pipe, no emoji icons, just plain text labels
- Remove the separate sections for figRefs, methodRefs, and pages
- Use `text-xs text-muted-foreground` for the consolidated refs line

**File: `src/components/paper-view/ModuleContentRenderer.tsx`**

- No structural changes needed -- the carousel wrapper stays the same, cards just become more compact inside it

