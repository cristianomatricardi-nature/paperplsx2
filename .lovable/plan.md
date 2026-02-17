

## AI Agent: Dedicated API Console UI

When the user switches to the "AI Agent" persona, replace the entire paper content area (summary card, modules, figures) with a dedicated API console interface. The sidebar and header remain, but the main content becomes an API type selector with three SpringerNature-branded endpoints.

### What Changes

**New component: `src/components/paper-view/AiAgentConsole.tsx`**
- Replaces the summary card + modules + figures when `subPersonaId === 'ai_agent'`
- Shows three API cards in a clean vertical stack:

  1. **SpringerNature Proof API** -- "Returns the exact evidence behind a claim so an agent can answer with verifiable support, not guesswork."
  2. **SpringerNature Repro API** -- "Returns a runnable recipe for a specific result so an agent can reproduce and automatically verify it."
  3. **SpringerNature Consensus API** -- "Returns the current standing of a claim across studies so an agent stays aware of conflicts, replications, and updates."

- Each card shows:
  - API name and description
  - A code block with an example curl command pre-filled with the paper ID and the user's endpoint URL
  - A "Copy" button for the curl example
  - A "Manage API Keys" link/button that navigates to `/api-keys`

- At the top, keep the `PersonaSelector` dropdown so the user can switch back to a human persona
- Include a brief header: "Machine-Readable API Access" with a subtitle explaining this view provides structured endpoints for programmatic consumption

**Edit: `src/pages/PaperViewPage.tsx`**
- In the main content area, add a conditional check: if `subPersonaId === 'ai_agent'`, render `<AiAgentConsole>` instead of `PersonalizedSummaryCard` + `ModuleAccordionList` + `FiguresSection`
- The top bar, header, and sidebar remain unchanged

### Layout

```text
+-----------------------------------------------+
| [Back]                        [Sidebar toggle] |
+-----------------------------------------------+
| Paper Title / Authors / Header                 |
|                                                |
| [Persona Selector: AI Agent v]                 |
|                                                |
| --- Machine-Readable API Access ---            |
| Structured endpoints for programmatic use      |
|                                                |
| +-------------------------------------------+  |
| | SpringerNature Proof API                  |  |
| | Returns the exact evidence behind a claim |  |
| | so an agent can answer with verifiable    |  |
| | support, not guesswork.                   |  |
| |                                           |  |
| | curl "https://...?paper_id=20&api=proof"  |  |
| |                           [Copy] [Keys]   |  |
| +-------------------------------------------+  |
|                                                |
| +-------------------------------------------+  |
| | SpringerNature Repro API                  |  |
| | ...                                       |  |
| +-------------------------------------------+  |
|                                                |
| +-------------------------------------------+  |
| | SpringerNature Consensus API              |  |
| | ...                                       |  |
| +-------------------------------------------+  |
+-----------------------------------------------+
```

### Technical Details

| File | Change |
|------|--------|
| `src/components/paper-view/AiAgentConsole.tsx` | New -- three API cards with descriptions, curl examples, copy buttons, and link to API keys page |
| `src/pages/PaperViewPage.tsx` | Conditional render: show `AiAgentConsole` when persona is `ai_agent`, otherwise show normal summary + modules + figures |

No database changes, no edge function changes. This is purely a frontend UI swap based on the selected persona.
