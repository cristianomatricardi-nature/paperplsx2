## Replication Cart in Paper++ Sidebar + Draggable Module Cards

### Overview

Add a  drop zone in the Paper++ right sidebar inside the Replication Assistant card. Make all content cards inside every module draggable -- protocol flow cards, claim cards, action cards, negative result cards, metrics rows, and evidence cards. Also draggambe the enitre module Dragging any card into the cart adds it (along with its associated method/data) to the replication plan, which persists when navigating to the Replication Assistant page.

### What Changes

**1. New Component: `src/components/paper-view/ReplicationCart.tsx**`

- A collapsible card in the sidebar showing a drop zone with "Drop module cards here to plan your replication"
- Accepts dragged items from any module via HTML5 drag-and-drop
- Each dropped item shows: source module badge (M1-M6), item title/label, and a remove button
- Displays a count of items and a "Open Replication Assistant" button that passes the cart items via React state/URL params
- Uses the same `MethodStep` type for protocol steps; wraps non-method items (claims, actions, etc.) in a lightweight `ReplicationCartItem` type containing `{ sourceModule, type, title, data }`

**2. Edit: `src/components/paper-view/PaperSidebar.tsx**`

- Import and render `ReplicationCart` as a new collapsible section between the Replication Assistant card and Community Engagement card
- Pass cart state down (lifted to PaperViewPage or managed locally with state)

**3. Edit: `src/pages/PaperViewPage.tsx**`

- Add `replicationCart` state (`ReplicationCartItem[]`) at page level
- Pass cart state + updater to both `PaperSidebar` and `ModuleAccordionList` (so cards know to be draggable)

**4. Make All Module Cards Draggable**

Each card type gets a `draggable` attribute and `onDragStart` handler that serializes its data into `application/json` with a `{ sourceModule, type, ... }` envelope:


| Card Component                         | Module | Drag Data Type     |
| -------------------------------------- | ------ | ------------------ |
| `ProtocolFlowView.tsx` (FlowCard)      | M3     | `method_step`      |
| `ClaimCard.tsx`                        | M2     | `claim`            |
| `ActionCard.tsx`                       | M5     | `action`           |
| `NegativeResultCard.tsx`               | M4     | `negative_result`  |
| `MetricsGrid.tsx` / `MetricsTable.tsx` | M1     | `metric`           |
| `EvidenceSummaryCard.tsx`              | M2     | `evidence_summary` |
| `ReproducibilityCard.tsx`              | M3     | `reproducibility`  |


Each card wraps its outermost `div` with:

```
draggable
onDragStart={(e) => {
  e.dataTransfer.setData('application/json', JSON.stringify({
    sourceModule: 'M2',
    type: 'claim',
    title: claim.statement,
    data: claim
  }));
  e.dataTransfer.effectAllowed = 'copy';
}}
```

A subtle drag handle icon (GripVertical) appears on hover for each card to indicate draggability.

**5. Edit: `src/components/paper-view/ModuleContentRenderer.tsx**`

- Pass `moduleId` down to each rendered card component so they know their source module for the drag envelope

**6. Integration with Replication Assistant**

- When clicking "Open Replication Assistant" from the cart, navigate to `/replication/:paperId` with the cart items stored in a lightweight context or sessionStorage
- The `ReplicationAssistantPage` reads these items on mount and pre-populates the `ExperimentPlanner` with any method steps from the cart, and displays non-method items as contextual reference cards above the planner

### Layout in Sidebar

```text
+----------------------------------+
| Replication Assistant            |
+
| Replication Cart (2 items)       |
| +------------------------------+ |
| | M3 | Substrate Preparation [x]| |
| | M2 | Claim: waveguide... [x]  | |
| +------------------------------+ |
| Drop module cards here...        |
| [Open Replication Assistant]     |
+----------------------------------+
| Community Engagement             |
+----------------------------------+
| Multidimensional Assessment      |
+----------------------------------+
```

### Technical Details


| File                                                          | Action                                             |
| ------------------------------------------------------------- | -------------------------------------------------- |
| `src/components/paper-view/ReplicationCart.tsx`               | New -- drop zone + cart item list in sidebar       |
| `src/components/paper-view/PaperSidebar.tsx`                  | Add ReplicationCart section                        |
| `src/pages/PaperViewPage.tsx`                                 | Lift cart state, pass to sidebar                   |
| `src/components/paper-view/renderers/ProtocolFlowView.tsx`    | Add draggable to FlowCard                          |
| `src/components/paper-view/renderers/ClaimCard.tsx`           | Add draggable                                      |
| `src/components/paper-view/renderers/ActionCard.tsx`          | Add draggable                                      |
| `src/components/paper-view/renderers/NegativeResultCard.tsx`  | Add draggable                                      |
| `src/components/paper-view/renderers/MetricsGrid.tsx`         | Add draggable to metric cards                      |
| `src/components/paper-view/renderers/EvidenceSummaryCard.tsx` | Add draggable                                      |
| `src/components/paper-view/renderers/ReproducibilityCard.tsx` | Add draggable                                      |
| `src/components/paper-view/ModuleContentRenderer.tsx`         | Pass moduleId to card components for drag envelope |
| `src/pages/ReplicationAssistantPage.tsx`                      | Read cart items from sessionStorage on mount       |


No database changes required. No new edge functions. This is a frontend-only drag-and-drop integration.