

## Plan: Inline Figure Rendering Inside Modules

### Problem

Three disconnects prevent figures from appearing inside modules:

1. **`FigurePlaceholder` ignores `bounding_box`** — It only checks `image_url` (rarely set). The canvas-crop logic lives in `FigureRenderer` but is never used inside modules. It also lacks `paperId`, which `FigureRenderer` needs.

2. **`ClaimCard` shows figure refs as plain text** — "fig_1, fig_2" appears in the footer but never renders the actual image.

3. **`replaceFigureTokens` doesn't pass `paperId`** — Even if `FigurePlaceholder` had crop support, it wouldn't work without the paper ID for constructing PNG URLs.

### Changes

| File | What |
|------|------|
| `src/components/paper-view/renderers/FigurePlaceholder.tsx` | Add `paperId` prop. When `bounding_box` exists, render using `FigureRenderer` (canvas crop from page PNGs). Falls back to `image_url` → sub-panels → text placeholder. |
| `src/components/paper-view/ModuleContentRenderer.tsx` | Pass `paperId` through `replaceFigureTokens`. Update ClaimCard carousel to pass `figures` array to each card. |
| `src/components/paper-view/renderers/ClaimCard.tsx` | Add optional `figures` prop. When present, render matching figures inline (compact thumbnail row) using `FigureRenderer` for bounding-box figures. Clickable to expand. |

### Data Flow After Change

```text
ModuleContentRenderer receives { content, moduleId, figures[], paperId }
  │
  ├── replaceFigureTokens(text, figures, paperId)
  │     └── FigurePlaceholder({ figure, paperId })
  │           └── FigureRenderer if bounding_box exists
  │
  └── ClaimCard({ claim, figures })
        └── For each claim.figure_refs → find matching figure
              └── Compact thumbnail via FigureRenderer
```

### What stays the same
- `FigureRenderer` canvas-crop logic — unchanged
- `FigureCard` (used in FiguresSection at bottom) — unchanged
- `generate-module-content` edge function — unchanged (already places `[FIGURE: fig_X]` tokens and passes figure context)
- Module prompts, RAG, caching — unchanged

