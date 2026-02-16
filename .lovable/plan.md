

## PaperHeader Visual Refinements

### Changes in `src/components/paper-view/PaperHeader.tsx`

**1. Remove author avatar circles (lines 100-107)**
Delete the colored circular initials (`<span className="flex h-6 w-6 ...">`) next to each author name. Keep only the text name.

**2. Journal name as plain text (lines 71-75)**
Replace the `<Badge variant="outline">` wrapping the journal name with a plain `<span>` styled like the date (muted, small text).

**3. DOI link color to black (line 84)**
Change `text-[hsl(var(--deep-blue))]` to `text-foreground` on the DOI link so it renders in black.

| Line(s) | What changes |
|----------|-------------|
| 71-75 | `Badge` becomes `<span className="text-sm font-sans text-muted-foreground">` |
| 84 | DOI link color from deep-blue to `text-foreground` |
| 100-107 | Remove the round avatar `<span>` element entirely |

No logic changes, className and element swaps only.
