

# Heatmap with Page Screenshot Backgrounds

## Problem
The current heatmap shows dots on a blank gray rectangle — impossible to understand what UI element the activity corresponds to.

## Solution
Replace the gray background with a **live iframe** of each page (same origin, auth cookies carry over). The iframe is non-interactive (`pointer-events: none`, `scrolling="no"`) and scaled down to fit the card. Heatmap dots are overlaid on top using absolute positioning.

## Design

Show one page at a time via the existing page selector. Each selected page renders as:

```text
┌─────────────────────────────────────────┐
│  [iframe of actual page, scaled to fit] │
│     ●        ●●●                        │
│          ●        ●●                    │
│  ●●●●              ●                   │
│               ●●●●●●●                  │
└─────────────────────────────────────────┘
│ Low ● Medium ●● High ●●● | Max: 42    │
```

The iframe renders the real page at full viewport width (1440px) then uses CSS `transform: scale()` to fit the card width. This gives a pixel-perfect miniature of the actual UI.

## Changes — `src/components/admin/HeatmapTab.tsx`

1. **Remove "all" filter option** — each page needs its own iframe background, so force single-page selection. Default to `/researcher-home`.

2. **Update PAGE_OPTIONS** to only the 4 requested pages:
   - Researcher Home (`/researcher-home`)
   - Paper View (`/paper/`) — use first available paper ID from the events, or a placeholder
   - Replication Assistant (`/replication/`)
   - Digital Lab (`/digital-lab`)

3. **Replace the gray `div` background** with an iframe:
   - `src` = the selected page path (e.g., `/researcher-home`)
   - `pointer-events: none` to prevent interaction
   - Rendered at 1440×900 in a container, then CSS-scaled to fit the card width
   - Semi-transparent white overlay on top of iframe to slightly wash it out, making dots more visible

4. **Overlay heatmap dots** on top using the same absolute positioning logic, but with a warmer color scale (red/orange gradient instead of primary blue) for better contrast against the page background.

5. **Use radial gradient blobs** instead of solid circles for a more traditional heatmap look — each dot becomes a soft radial gradient from the center color to transparent.

## Files
| File | Change |
|------|--------|
| `src/components/admin/HeatmapTab.tsx` | Full rewrite of visualization: iframe background + overlay dots with gradient blobs |

