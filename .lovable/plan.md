
# Conditionally Show Sidebar Sections by Persona

## Goal
Show Replication Assistant and Analytical Pipeline cards only for the **Researcher** parent persona. All other personas (Policy Maker, Funding Agency, Educator, Industry R&D, AI Agent) see only the Multidimensional Assessment card.

## Changes

### `src/components/paper-view/PaperSidebar.tsx`

1. **Import `PARENT_PERSONA_MAP`** from `@/lib/constants`
2. **Derive `isResearcher`** from `subPersonaId`:
   ```
   const isResearcher = PARENT_PERSONA_MAP[subPersonaId] === 'Researcher';
   ```
3. **Collapsed state** (lines 150-181): Conditionally render the "Replication" and "Pipeline" vertical tab buttons only when `isResearcher` is true. The "Assessment" button always shows.
4. **Expanded state** (lines 184-409): Wrap the Replication Assistant card (lines 189-223) and Analytical Pipeline card (lines 226-260) in `{isResearcher && (...)}` so they only render for Researcher personas. The Multidimensional Assessment card remains visible for all personas.

### No other file changes needed
The `subPersonaId` prop is already passed to `PaperSidebar` from `PaperViewPage`.
