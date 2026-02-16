

## Fix: Persona ID Mismatch Between Frontend and Backend

### Root Cause

The error `"Unknown sub_persona_id: phd_postdoc"` reveals the core problem: **the frontend and backend use completely different persona ID systems**.

**Frontend** (`src/types/modules.ts`) sends these IDs:
- `phd_postdoc`, `pi_tenure`, `think_tank`, `gov_institution`, `funder_governmental`, `funder_private`, `industry_rd`

**Backend** (`supabase/functions/_shared/sub-personas.ts`) expects these IDs:
- `expert_researcher`, `expert_clinician`, `student_phd`, `student_undergrad`, `reviewer_peer`, `reviewer_editor`, `journalist_science`, `journalist_policy`, `general_curious`, `general_investor`

There is zero overlap. Every call from the frontend to `generate-summary` or `generate-module-content` fails immediately with a 400 error because the persona ID is not found in the backend registry.

### The Fix

Rewrite `supabase/functions/_shared/sub-personas.ts` to use the same 7 persona IDs as the frontend, carrying over the same labels, pain points, quantitative depth, and language style from the frontend registry.

### Changes

**File: `supabase/functions/_shared/sub-personas.ts`**

Replace the entire registry with entries matching the frontend IDs:

| Backend Key (new) | Label | Parent |
|---|---|---|
| `phd_postdoc` | PhD Student / Post-doc | Researcher |
| `pi_tenure` | Tenure-Track Faculty / PI | Researcher |
| `think_tank` | Think Tank Researcher/Analyst | Policy Maker |
| `gov_institution` | Governmental Institution Official | Policy Maker |
| `funder_governmental` | Governmental Funder (NSF/ERC/NIH) | Funding Agency |
| `funder_private` | Private Funder (Gates/Wellcome) | Funding Agency |
| `industry_rd` | Industry R&D Professional | Industry R&D |

Each entry will use the `painPoint`, `quantitativeDepth`, and `languageStyle` values already defined in the frontend's `SUB_PERSONA_REGISTRY`.

**No other files need changes** -- both `generate-summary` and `generate-module-content` already look up personas via `SUB_PERSONA_REGISTRY[subPersonaId]`, so fixing the keys in the shared file is the only change needed.

After this fix, the personalized summary card and all module accordions will work when you view a paper.
