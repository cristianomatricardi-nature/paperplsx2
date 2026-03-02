

# Admin-Only "Show Prompt" Debug Button for Infographic Generation

## Overview
After generating an infographic, admin users will see a "Show Prompt" button that opens a dialog displaying the exact prompt sent to Gemini, along with all assets (module JSON data, PDF context status).

## Changes

### 1. Edge function: `supabase/functions/generate-policy-infographic/index.ts`
- Include a `debug` object in the success response alongside `image_url`
- The debug object will contain:
  - `prompt_text` -- the full composed text prompt
  - `model` -- the model name used
  - `modules_used` -- object with M1, M2, M5 raw content (or null if missing)
  - `pdf_included` -- boolean indicating whether PDF page was sent
  - `claims_extracted` -- the parsed claims array
  - `metrics_extracted` -- the parsed metrics array
  - `actions_extracted` -- the parsed actions arrays

### 2. API client: `src/lib/api.ts`
- No signature change needed; the response already returns the full `data` object, so `debug` will be available automatically

### 3. Frontend: `src/components/paper-view/views/InfographicPanel.tsx`
- Import `useUserRole` hook and Dialog components
- Store the `debug` payload from the generation response in local state
- After generation succeeds, if the user is admin, show a small "Show Prompt" button (e.g., with a `Code` or `Eye` icon) next to the Regenerate button
- Clicking it opens a Dialog with:
  - **Prompt tab**: the full text prompt in a scrollable monospace block
  - **Modules tab**: collapsible JSON views of M1, M2, M5 data
  - **Assets tab**: PDF included (yes/no), model name, extracted claims/metrics/actions
- Use Tabs inside the Dialog for clean organization

### 4. No database changes needed

## UI Behavior
- The "Show Prompt" button only appears for admin users (checked via `useUserRole`)
- It only appears after a successful generation (when debug data is available)
- The dialog is read-only, purely for inspection
- Non-admin users see no change at all

## Technical Notes
- The `useUserRole` hook already exists and queries the `user_roles` table
- The debug payload is returned from the edge function but only surfaced in UI for admins -- no security risk since the edge function already requires authentication
- The debug data is kept in component state (not persisted) and resets on page navigation

