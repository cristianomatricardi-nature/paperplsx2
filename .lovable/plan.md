

# Rework Infographic and Policy Brief Card Layout

## Problem
The Infographic Panel and Policy Brief Card are currently displayed side-by-side in a 2-column grid, making the generated infographic too small to read properly.

## Solution
Stack them vertically as full-width cards (matching the Evidence Dashboard Strip width), with the Infographic Panel on top and the Policy Brief Card below. When an infographic is generated, the card expands to maximize the image display.

## Changes

### 1. `src/components/paper-view/views/PolicyMakerView.tsx`
- Remove the `grid grid-cols-1 md:grid-cols-2 gap-4` wrapper
- Render `InfographicPanel` first as a full-width card
- Render `PolicyBriefCard` below it as a full-width card
- Update loading skeletons to match the new stacked layout

### 2. `src/components/paper-view/views/InfographicPanel.tsx`
- Before generation: show the section list and generate button in a compact layout (similar to current)
- After generation: expand the card to show the infographic image at full width with no constrained height, so the image renders at its natural aspect ratio
- The generate/regenerate button and admin "Show Prompt" button move below the image
- Remove the `h-full` constraint so the card sizes naturally to its content

### 3. `src/components/paper-view/views/PolicyBriefCard.tsx`
- Remove `h-full` constraint
- Adjust layout to work well as a full-width card (the content already flows vertically, so minimal changes needed)

## Visual Order (after changes)
```text
[Evidence Dashboard Strip          ] -- full width (unchanged)
[Policy Tags Row                   ] -- full width (unchanged)
[Infographic Panel                 ] -- full width, expands with image
[Policy Brief Card                 ] -- full width
[Policy Content Matcher            ] -- full width (unchanged)
```
