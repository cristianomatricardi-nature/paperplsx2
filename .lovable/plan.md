

## Persona Selection + AI Agent API

### Part 1: Persona Selection Step (After Upload Completes)

When the pipeline finishes processing, instead of immediately navigating to the paper view, show a persona selection screen where the user ticks which sub-personas to generate content for.

**Changes:**

**New component: `src/components/researcher-home/PersonaSelectionStep.tsx`**
- Displays all 7 sub-personas grouped by parent (Researcher, Policy Maker, Funding Agency, Industry R&D) with checkboxes
- Each persona shows its short label and a one-line pain point description
- A "Continue to Paper++" button at the bottom
- Selected personas are stored on the `papers` row in a new `selected_personas` JSONB column (array of SubPersonaId strings)
- Default: `phd_postdoc` pre-checked

**Edit: `src/components/researcher-home/UploadSection.tsx`**
- After pipeline completes (`isPipelineDone`), replace the "View Paper++" button with the `PersonaSelectionStep` component
- On confirm, save selected personas to DB, then navigate to `/paper/:paperId`

**Edit: `src/pages/PaperViewPage.tsx` and `PublicPaperViewPage.tsx`**
- Fetch `selected_personas` from the paper record
- Filter `PersonaSelector` dropdown to only show the selected personas
- Filter `MODULE_ORDER_BY_PERSONA` lookups to only show content for selected personas

**Database migration:**
- Add `selected_personas` JSONB column to `papers` table (default `'["phd_postdoc"]'`)

---

### Part 2: AI Agent Persona with REST API

Create a new edge function that serves as a structured REST API for machine consumption of paper data.

**New sub-persona: `ai_agent`**
- Added to both frontend `SUB_PERSONA_REGISTRY` and backend `SUB_PERSONA_REGISTRY`
- Parent persona: "AI Agent"
- Returns raw structured data optimized for machine parsing (all numbers, no prose embellishments)
- Does NOT appear in the human persona selector -- it's API-only

**New edge function: `supabase/functions/paper-api/index.ts`**
- Endpoint: `/paper-api`
- Authentication: API key passed as `Authorization: Bearer <key>` header (validated against a `paper_api_keys` table)
- Endpoints (via query params):
  - `?paper_id=42` -- returns paper metadata + structured data
  - `?paper_id=42&module=M1` -- returns a specific module's generated content for the `ai_agent` persona
  - `?paper_id=42&summary=true` -- returns the AI agent summary
- Returns clean JSON with no HTML

**Database migration:**
- Create `paper_api_keys` table: `id`, `user_id`, `api_key` (hashed), `label`, `created_at`, `last_used_at`
- RLS: users can only see/manage their own keys

**New page: `src/pages/ApiKeysPage.tsx`** (or section in a settings page)
- UI to generate, view, and revoke API keys
- Shows the endpoint URL and example curl commands

---

### Technical Details

| File | Change |
|------|--------|
| `src/components/researcher-home/PersonaSelectionStep.tsx` | New -- checkbox grid for persona selection |
| `src/components/researcher-home/UploadSection.tsx` | Show persona selection after pipeline completes |
| `src/pages/PaperViewPage.tsx` | Filter persona selector to selected personas |
| `src/pages/PublicPaperViewPage.tsx` | Same persona filtering |
| `src/components/paper-view/PersonaSelector.tsx` | Accept optional `allowedPersonas` prop to filter options |
| `src/types/modules.ts` | Add `ai_agent` to `SubPersonaId` type (but exclude from UI registry) |
| `src/lib/constants.ts` | Add `ai_agent` module order |
| `supabase/functions/_shared/sub-personas.ts` | Add `ai_agent` sub-persona definition |
| `supabase/functions/paper-api/index.ts` | New -- REST API endpoint for AI agents |
| `supabase/config.toml` | Add `paper-api` function config |
| `src/pages/ApiKeysPage.tsx` | New -- API key management UI |
| `src/App.tsx` | Add `/api-keys` route |
| Database migration | Add `selected_personas` column to papers; create `paper_api_keys` table |

