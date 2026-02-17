

## Multi-Feature Plan: Protocol Flow, Drag-and-Drop Experiment Planner, and AI Agentic Planning

This plan addresses four interconnected issues across the protocol module, replication assistant, and AI planning.

---

### Issue 1: Only One Method Extracted

The database currently contains only **one method** for paper 20 ("Fabrication of Photonic Integrated Circuits"). This is a data extraction issue -- the structuring prompt groups everything into a single method instead of breaking it into granular protocol steps. The fix is to update the structuring prompt to instruct the AI to extract **each distinct protocol step** as a separate method entry.

**File: `supabase/functions/run-structuring/index.ts`**
- Update the MASTER_STRUCTURING_PROMPT methods instruction to emphasize extracting **every distinct step** as a separate method entry (e.g., "Substrate Preparation", "Lithography", "Etching", "Sputtering", "Heater Definition" should each be their own method)
- Add explicit guidance: "Break complex procedures into individual steps. A typical experimental paper has 5-15 method steps."

After deploying, re-running the structuring pipeline on paper 20 will populate the methods array with multiple entries.

---

### Issue 2: Better Protocol Flow Visualization in M3 Module

Replace the current linear numbered list of `ProtocolStep` cards with an interconnected flow visualization.

**New file: `src/components/paper-view/renderers/ProtocolFlowView.tsx`**
- Render protocol steps as connected cards in a vertical flow with SVG connector lines between them
- Each card shows: step number badge, title, description, duration badge, tools/reagents chips
- Cards are connected by vertical lines with small arrow indicators showing the flow direction
- Clicking a card expands it to show full details (conditions, critical notes, page refs)
- Add a "Generate Infographic" button at the top that calls an edge function to produce a visual summary

**New file: `supabase/functions/generate-protocol-infographic/index.ts`**
- Takes paper_id and method steps as input
- Uses Lovable AI (google/gemini-3-flash-preview) to generate a structured infographic description (SVG-compatible data: step boxes, icons, timing, flow arrows)
- Returns structured JSON that the frontend renders as a visual infographic card

**Edit: `src/components/paper-view/ModuleContentRenderer.tsx`**
- For M3 protocol sections, replace the current `ProtocolStep` list rendering with the new `ProtocolFlowView` component

---

### Issue 3: Drag-and-Drop Experiment Planner in Replication Assistant

Redesign the right column of the Replication Assistant to include a drag-and-drop experiment planning area.

**New file: `src/components/replication/ExperimentPlanner.tsx`**
- A drop zone area at the top of the right column with the label "Drop protocol steps here to plan your experiment"
- Uses HTML5 drag-and-drop API (no extra dependencies needed)
- Accepts dragged MethodCards from the left sidebar or protocol steps from the M3 module
- Dropped items stack vertically in the planner as an ordered experiment plan
- Each dropped item shows: step name, requirements summary (available/missing count), and a remove button
- Items can be reordered by dragging within the planner
- The existing GapSummary and RequirementsComparison update dynamically to reflect only the items in the planner

**Edit: `src/components/replication/MethodCard.tsx`**
- Make cards draggable with `draggable="true"` and `onDragStart` to set the method data in the drag transfer

**Edit: `src/pages/ReplicationAssistantPage.tsx`**
- Replace the current "select a method" click-based approach with the drag-and-drop planner
- Keep the left sidebar method list as the source, add the ExperimentPlanner as the main content area
- The GapSummary and RequirementsComparison render below the planner based on dropped items
- Maintain backward compatibility: clicking a method still selects it (for quick view), but the planner enables multi-step experiment design

---

### Issue 4: AI Agentic Planning Button

Add an "AI Agentic Planning" button to the Replication Assistant that uses AI to optimize resources.

**New file: `src/components/replication/AgenticPlanningPanel.tsx`**
- A panel/dialog that opens when clicking "AI Agentic Planning"
- Shows a loading state while the AI processes
- Displays results in sections:
  - **Resource Optimization**: Groups that can provide missing resources (based on the paper's field and common lab sharing networks)
  - **Approximation Suggestions**: For each missing item, suggest alternatives within a fidelity range (e.g., "You have X, which can approximate Y with 85% fidelity")
  - **Step-by-Step Guide**: Generated protocol with your actual available equipment substituted in
  - **Instrument Setup**: If connected lab instruments are available, provide configuration steps

**New file: `supabase/functions/agentic-planning/index.ts`**
- Takes: paper methods, user's lab inventory, missing requirements list
- Uses Lovable AI (google/gemini-3-flash-preview) to:
  - Analyze missing resources and suggest alternatives from the user's inventory
  - Score approximation fidelity (0-100%)
  - Generate a step-by-step replication guide using available equipment
  - Suggest research groups/core facilities that commonly share the missing equipment type
- Returns structured JSON with optimization suggestions

**Edit: `src/pages/ReplicationAssistantPage.tsx`**
- Add "AI Agentic Planning" button with a Sparkles icon in the action bar (bottom footer)
- Wire it to open the AgenticPlanningPanel with current requirements and inventory data

---

### Technical Summary

| File | Action |
|------|--------|
| `supabase/functions/run-structuring/index.ts` | Update prompt to extract granular method steps |
| `src/components/paper-view/renderers/ProtocolFlowView.tsx` | New -- interconnected flow cards for protocols |
| `src/components/paper-view/renderers/ProtocolStep.tsx` | Keep as fallback, but ProtocolFlowView becomes primary |
| `src/components/paper-view/ModuleContentRenderer.tsx` | Use ProtocolFlowView for M3 protocol data |
| `supabase/functions/generate-protocol-infographic/index.ts` | New -- AI-generated infographic data |
| `src/components/replication/ExperimentPlanner.tsx` | New -- drag-and-drop experiment planning area |
| `src/components/replication/MethodCard.tsx` | Add draggable behavior |
| `src/components/replication/AgenticPlanningPanel.tsx` | New -- AI resource optimization panel |
| `supabase/functions/agentic-planning/index.ts` | New -- AI planning backend |
| `src/pages/ReplicationAssistantPage.tsx` | Integrate planner + agentic planning button |
| `supabase/config.toml` | Add new edge function entries |

