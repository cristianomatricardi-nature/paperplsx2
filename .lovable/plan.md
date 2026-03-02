

# Add Funding Agency Visualization + Educator Persona

## Overview

Two major additions:
1. **Funding Agency view** -- a dedicated "Grant Accountability Dashboard" that shows whether funded research hit its aims, with traceable evidence links
2. **Educator persona** -- a new parent persona with one sub-persona ("Science Educator") and a "Lesson Plan Builder" visualization

Both follow the existing pattern: register persona/sub-persona in both frontend and backend registries, write a liquefaction prompt, create a view component, add the case to the PaperViewPage dispatcher.

---

## Part 1: Funding Agency Visualization

### 1A. Liquefaction Prompt (backend)

**File:** `supabase/functions/_shared/parent-personas.ts`

Fill in the currently-stubbed `'Funding Agency'` entry with a full `liquefactionPrompt` that consumes cached M1 + M2 + M5 and produces this JSON schema:

```text
{
  metadata: { title, authors, journal, year, doi, funders, grant_ids },
  aims: [{ id, statement, planned_endpoint, status, outcome_summary,
           effect_size_text, uncertainty_text, confidence, confidence_rationale[],
           evidence_refs[] }],
  key_findings: [{ id, finding, effect_size_text, uncertainty_text,
                   population_or_model, conditions, confidence, evidence_refs[] }],
  evidence_refs: [{ id, type, label, caption_or_excerpt, section, url_or_anchor }],
  outputs: { data[], code[], protocols[], materials[] },
  limitations: [],
  next_steps: [{ step, gating_evidence, dependency, scale_hint }],
  compliance: { oa_status, data_availability, code_availability, ethics, coi }
}
```

The prompt will instruct GPT-4o to:
- Extract every stated research aim and map it to outcomes (met/partial/not_met/inconclusive/not_addressed)
- Assign confidence (high/medium/low) with rationale
- Link every claim to evidence_refs (figure/table/text)
- Avoid cross-paper metrics, citation counts, or journal impact factor
- Include a disclaimer: "This summary reflects one paper and does not measure real-world impact."

### 1B. API Layer

**File:** `src/lib/api.ts` -- add `fetchFunderView(paperId, subPersonaId)` (mirrors `fetchPolicyView`)

**File:** `src/hooks/useFunderView.ts` -- new hook mirroring `usePolicyView.ts` with typed `FunderViewPayload`

### 1C. Edge Function

The existing `generate-policy-view/index.ts` is already generic -- it reads from `PARENT_PERSONA_REGISTRY` and uses the `liquefactionPrompt`. The same function works for Funders since the logic is: check cache -> fetch modules -> call liquefaction prompt -> cache result.

We need to update it to use `content_type` based on parent persona rather than hardcoded `'policy_view'`. We'll add a `content_type` mapping: `'Policy Maker' -> 'policy_view'`, `'Funding Agency' -> 'funder_view'`.

Alternatively, create a new `generate-funder-view/index.ts` to keep things clean and independent (simpler, avoids touching Policy Maker logic).

**Decision:** Create a new `supabase/functions/generate-funder-view/index.ts` that mirrors `generate-policy-view` but with `content_type = 'funder_view'`.

### 1D. Frontend Components

All in `src/components/paper-view/views/`:

1. **FunderView.tsx** -- main orchestrator (like PolicyMakerView)
   - Uses `useFunderView` hook
   - Layout top-to-bottom: Header badges, Aim Attainment Grid, Key Findings Cards, Confidence Scorecard, Reusable Outputs, Next Steps, Stewardship Badges

2. **AimAttainmentGrid.tsx** -- compact grid of aims with status chips (Met/Partial/Not Met/Inconclusive/Not Addressed) and confidence chips (High/Medium/Low). Each aim is clickable to open the Evidence Drawer.

3. **KeyFindingCard.tsx** -- card showing finding + effect size + uncertainty + confidence + "Show evidence" button

4. **ConfidenceScorecard.tsx** -- checklist-style rows, each with a label, confidence badge, and expandable "Why?" rationale

5. **ReusableOutputsPanel.tsx** -- cards for data/code/protocol/materials with license and access badges

6. **NextStepsGates.tsx** -- impact pathway list with gating evidence and dependencies

7. **StewardshipBadges.tsx** -- OA/data/code/ethics/COI badge row

8. **EvidenceDrawer.tsx** -- right-side sheet (using Radix Sheet) showing evidence snippet, source location (Figure/Table/Section), link anchor, and list of all claims citing this evidence. Opens when clicking any evidence_ref link.

### 1E. Wire into PaperViewPage

Add `'Funding Agency'` case to the switch in `PaperViewPage.tsx` that dispatches to `FunderView`.

---

## Part 2: Educator Persona

### 2A. Sub-Persona Registry (backend)

**File:** `supabase/functions/_shared/sub-personas.ts` -- add `science_educator` entry:
- parentPersona: `'Educator'`
- numberPolicy: `'explained_raw'`
- jargonLevel: `'define_all'`
- languageStyle: educational, scaffolded, age-appropriate adaptations
- depthPreference: `'balanced'`
- educationalExtras: `true`
- moduleInstructions for M1-M6 focused on pedagogical framing (learning objectives, discussion questions, common misconceptions)

### 2B. Sub-Persona Registry (frontend)

**File:** `src/types/modules.ts`:
- Add `'science_educator'` to `SubPersonaId` union type
- Add entry to `SUB_PERSONA_REGISTRY` array

### 2C. Constants Updates

**File:** `src/lib/constants.ts`:
- Add `science_educator` to `MODULE_ORDER_BY_PERSONA` (suggested order: M6, M1, M2, M3, M5, M4 -- SciComm first for educators)
- Add `science_educator: 'Educator'` to `PARENT_PERSONA_MAP`
- Add `Educator` to `PERSONA_CONTENT_MODALITIES`

### 2D. Parent Persona Config (backend)

**File:** `supabase/functions/_shared/parent-personas.ts` -- add `'Educator'` entry:
- visualizationType: `'lesson_plan'`
- primaryModules: `['M6', 'M1', 'M2']`
- secondaryModules: `['M3', 'M5', 'M4']`
- liquefactionInputModules: `['M1', 'M2', 'M6']`
- Full liquefaction prompt that produces:

```text
{
  learning_objectives: [{ objective, bloom_level, source_module }],
  simplified_explanation: { summary, key_concepts[], prerequisite_knowledge[] },
  discussion_questions: [{ question, suggested_answer_points[], difficulty }],
  classroom_activities: [{ title, description, duration, materials, learning_outcome }],
  misconceptions: [{ misconception, correction, evidence_ref }],
  assessment: { quiz_questions: [{ question, options[], correct, explanation }] },
  further_reading: [{ title, type, url_or_description, level }]
}
```

### 2E. Edge Function

**File:** `supabase/functions/generate-educator-view/index.ts` -- mirrors `generate-policy-view` with `content_type = 'educator_view'`

### 2F. Frontend Components

All in `src/components/paper-view/views/`:

1. **EducatorView.tsx** -- main orchestrator
2. **LearningObjectivesPanel.tsx** -- objectives with Bloom's taxonomy level badges
3. **SimplifiedExplanation.tsx** -- layered summary with key concepts and prerequisites
4. **DiscussionQuestions.tsx** -- expandable cards with suggested answer points
5. **ClassroomActivities.tsx** -- activity cards with duration, materials, and outcomes
6. **AssessmentQuiz.tsx** -- interactive quiz with reveal-answer functionality
7. **FurtherReadingList.tsx** -- reading list with level indicators

### 2G. API + Hook

- `src/lib/api.ts` -- add `fetchEducatorView()`
- `src/hooks/useEducatorView.ts` -- new hook with typed `EducatorViewPayload`

### 2H. Wire into PaperViewPage + PersonaSelector

- Add `'Educator'` case to the switch in `PaperViewPage.tsx`
- The PersonaSelector already groups by parent persona dynamically, so it will pick up the new Educator group automatically

---

## Implementation Sequence

1. Backend registries first (sub-personas.ts, parent-personas.ts, modules.ts, constants.ts)
2. Edge functions (generate-funder-view, generate-educator-view)
3. API layer + hooks
4. Funder view components (8 components)
5. Educator view components (7 components)
6. Wire both into PaperViewPage dispatcher

## File Change Summary

| Action | File |
|--------|------|
| Edit | `supabase/functions/_shared/sub-personas.ts` |
| Edit | `supabase/functions/_shared/parent-personas.ts` |
| Edit | `src/types/modules.ts` |
| Edit | `src/lib/constants.ts` |
| Edit | `src/lib/api.ts` |
| Edit | `src/pages/PaperViewPage.tsx` |
| Create | `supabase/functions/generate-funder-view/index.ts` |
| Create | `supabase/functions/generate-educator-view/index.ts` |
| Create | `src/hooks/useFunderView.ts` |
| Create | `src/hooks/useEducatorView.ts` |
| Create | `src/components/paper-view/views/FunderView.tsx` |
| Create | `src/components/paper-view/views/AimAttainmentGrid.tsx` |
| Create | `src/components/paper-view/views/KeyFindingCard.tsx` |
| Create | `src/components/paper-view/views/ConfidenceScorecard.tsx` |
| Create | `src/components/paper-view/views/ReusableOutputsPanel.tsx` |
| Create | `src/components/paper-view/views/NextStepsGates.tsx` |
| Create | `src/components/paper-view/views/StewardshipBadges.tsx` |
| Create | `src/components/paper-view/views/EvidenceDrawer.tsx` |
| Create | `src/components/paper-view/views/EducatorView.tsx` |
| Create | `src/components/paper-view/views/LearningObjectivesPanel.tsx` |
| Create | `src/components/paper-view/views/SimplifiedExplanation.tsx` |
| Create | `src/components/paper-view/views/DiscussionQuestions.tsx` |
| Create | `src/components/paper-view/views/ClassroomActivities.tsx` |
| Create | `src/components/paper-view/views/AssessmentQuiz.tsx` |
| Create | `src/components/paper-view/views/FurtherReadingList.tsx` |

