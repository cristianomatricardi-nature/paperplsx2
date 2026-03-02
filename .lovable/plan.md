

# Make Funder & Educator Views More Interactive and Structured

## Data Source (Your Question)

Yes -- both views **do** come from the main parsing and RAG structuring. The flow is:

1. Paper upload triggers parsing pipeline (chunking, embedding, structuring into M1-M6 modules)
2. When you select a Funder or Educator persona, a "liquefaction" edge function fetches the cached M1+M2+M5 (Funder) or M1+M2+M6 (Educator) module outputs
3. Those structured chunks are fed into a synthesis prompt that produces the persona-specific JSON
4. The frontend renders that JSON

So the structured chunks are indeed the building blocks of everything you see.

---

## Changes Overview

Redesign both views to feel more like the Policy Maker view: contained cards with clear purpose, visual hierarchy, and interactivity -- not a flat list of sections.

---

## Funder View Improvements

**Current problem:** Flat list of sections (Aim Attainment, Key Findings, Confidence, Outputs, Next Steps, Stewardship) stacked vertically with no visual grouping or interactive flow.

**New layout (top to bottom):**

1. **Header strip** (already exists) -- keep DOI badges, grant badges, Export JSON button. No changes needed.

2. **Aim Attainment Grid** -- wrap in a proper `Card` with header. Add collapsible confidence rationale inline (click "Why?" to expand rationale bullets). Currently rationale exists in the data but isn't shown.

3. **Key Findings + Confidence side-by-side** -- place Key Findings cards and Confidence Scorecard in a 2-column grid layout (like Policy Maker's Brief + Infographic). Key Findings on the left, Confidence Scorecard on the right. This creates visual pairing instead of two separate vertical blocks.

4. **Reusable Outputs + Stewardship row** -- combine into a single card with two sections (tabs or stacked). Outputs on top, stewardship badges below as a footer row. Currently these are two separate disconnected blocks.

5. **Next Steps** -- wrap in a `Card` with a cleaner visual. Add a subtle connecting line between steps to suggest a pathway/sequence.

6. **Hide "Export JSON" for now** -- keep it but move to a small icon button in the header to reduce noise.

### Specific component changes:

- **AimAttainmentGrid.tsx**: Wrap in `Card`. Add collapsible `Collapsible` for confidence rationale on each aim. Add a subtle left-border color based on status (green for met, amber for partial, etc.).
- **FunderView.tsx**: Restructure layout to use `grid grid-cols-1 md:grid-cols-2` for findings + confidence. Combine outputs + stewardship into one card.
- **KeyFindingCard.tsx**: Already a card -- add a colored left border based on confidence level.
- **ConfidenceScorecard.tsx**: Wrap in a `Card` to match visual weight of Key Findings.

---

## Educator View Improvements

**Current problem:** Same flat list issue. Learning Objectives, Explanation, Misconceptions, Discussion Questions, Activities, Quiz, Further Reading all stacked with no grouping.

**New layout (top to bottom):**

1. **Hero card** -- a single top card combining the Simplified Explanation summary with prerequisite knowledge badges. This is the "what is this paper about" entry point, similar to Policy Maker's Evidence Dashboard Strip.

2. **Learning Objectives + Key Concepts side-by-side** -- 2-column grid. Objectives on left (already compact), Key Concepts on right (term/definition/analogy cards). Currently key concepts are buried inside SimplifiedExplanation.

3. **Teaching Resources card** -- a tabbed card (using Radix Tabs) combining:
   - Tab 1: "Discussion" -- Discussion Questions with expandable answers
   - Tab 2: "Activities" -- Classroom Activities 
   - Tab 3: "Misconceptions" -- Common misconceptions
   
   This groups the "in-class use" content into one interactive block instead of three separate sections.

4. **Further Reading** -- keep as-is at the bottom (already clean).

5. **Assessment Quiz** -- hidden (as requested).

### Specific component changes:

- **EducatorView.tsx**: Major restructure. Remove AssessmentQuiz rendering. Create hero card from simplified_explanation.summary + prerequisites. Split key concepts out of SimplifiedExplanation into its own column. Add tabbed "Teaching Resources" card.
- **SimplifiedExplanation.tsx**: Simplify to just render the summary text and prerequisites as a hero card (remove key concepts from this component).
- **New: KeyConceptsGrid.tsx** -- extracted from SimplifiedExplanation, renders key concept cards in their own section.
- **EducatorView.tsx**: Wrap Discussion Questions, Activities, and Misconceptions inside a `Tabs` component within a single `Card`.

---

## File Changes

| Action | File | What |
|--------|------|------|
| Edit | `src/components/paper-view/views/FunderView.tsx` | 2-column grid layout, combine outputs+stewardship |
| Edit | `src/components/paper-view/views/AimAttainmentGrid.tsx` | Wrap in Card, add collapsible rationale, colored left borders |
| Edit | `src/components/paper-view/views/KeyFindingCard.tsx` | Add colored left border by confidence |
| Edit | `src/components/paper-view/views/ConfidenceScorecard.tsx` | Wrap in Card |
| Edit | `src/components/paper-view/views/ReusableOutputsPanel.tsx` | Remove outer heading (will be inside combined card) |
| Edit | `src/components/paper-view/views/StewardshipBadges.tsx` | Remove outer heading (will be inside combined card) |
| Edit | `src/components/paper-view/views/EducatorView.tsx` | Major restructure: hero card, 2-col grid, tabbed teaching resources, hide quiz |
| Edit | `src/components/paper-view/views/SimplifiedExplanation.tsx` | Simplify to hero-card format (summary + prerequisites only) |
| Create | `src/components/paper-view/views/KeyConceptsGrid.tsx` | Extracted key concepts display |

