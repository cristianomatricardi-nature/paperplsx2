

## Adopt Nature.com Article Proportions

The Nature.com layout doesn't span the full browser width. Instead, it uses a centered container (~1200px max-width) with generous side margins, and the content-to-sidebar ratio is roughly 65:35 with a clear gap between them.

### Changes

**`src/pages/PaperViewPage.tsx`**
- Wrap the main grid in a centered container with `max-width: 1200px` and horizontal auto margins
- Keep the top bar full-width for the sticky nav feel
- Change the grid from `grid-cols-12` (8:4) to a more Nature-like layout: main content area gets ~65% and sidebar ~35%, using `grid-cols-[1fr_320px]` (fixed sidebar width like Nature.com)
- Remove `max-w-2xl mx-auto` from the inner content div — the container constraint handles width now
- Add more breathing room with proper padding

**`src/components/paper-view/PaperSidebar.tsx`**
- Adjust the sidebar to work within the new fixed-width column (no longer col-span-4 of full width)
- The sidebar content already fits well at ~300-320px

### Visual result
- Content no longer stretches edge-to-edge
- Centered reading experience matching Nature.com's academic journal feel
- Sidebar stays proportional and doesn't feel oversized

