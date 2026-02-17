

## Fix: Make Modules Draggable + Pipeline Drop Zone Visible

### Problem
1. The module accordions (M1-M6) themselves are **not draggable** -- only small individual cards inside them (claims, metrics, etc.) have drag support. Users expect to grab an entire module and drop it into the Pipeline Cart.
2. The Analytical Pipeline sidebar section **starts collapsed**, hiding the drop zone entirely. Users can't see where to drop items.

### Changes

**1. Make each Module Accordion draggable (`ModuleAccordion.tsx`)**

- Add `draggable` attribute to the outer container `<div>`
- Add `onDragStart` handler that sets `application/json` data with `{ sourceModule, type: 'module', title, data }` -- matching the same schema used by individual cards (ClaimCard, ActionCard, etc.)
- Add a subtle drag handle icon (GripVertical) to the left of the module title so users know they can drag it
- Add `cursor-grab` styling on hover to signal draggability

**2. Open the Analytical Pipeline section by default (`PaperSidebar.tsx`)**

- Change `pipeline: false` to `pipeline: true` in the initial `openSections` state so the drop zone is immediately visible when the sidebar loads

**3. Visual polish for drag affordance**

- Add a brief tooltip or subtle text under the Pipeline Cart drop zone: "Drag any module header or card here"
- Add a slight visual highlight (pulse or border glow) on the Pipeline Cart when any drag operation starts anywhere on the page, using the `dragenter`/`dragleave` events on the document to detect global drag activity

### Technical Details

| File | Change |
|------|--------|
| `src/components/paper-view/ModuleAccordion.tsx` | Add `draggable`, `onDragStart` to outer div; add GripVertical icon |
| `src/components/paper-view/PaperSidebar.tsx` | Set `pipeline: true` in default `openSections` state |

No new files, no database changes, no edge function changes.

