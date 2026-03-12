

## Admin-Controlled Default Personas

### Summary
Add a "Settings" tab inside the existing Admin Dashboard (`/admin`) — visible only to admins — where you can toggle which sub-personas are active for all new papers. Skip the persona selection page for regular users entirely.

### Database

Create an `app_settings` table (single-row config):

```sql
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_personas jsonb NOT NULL DEFAULT '["phd_postdoc","pi_tenure","think_tank","science_educator","ai_agent","funder_private"]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed so PaperViewPage can fetch defaults)
CREATE POLICY "Authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

-- Only admins can update
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed row
INSERT INTO public.app_settings (default_personas) VALUES ('["phd_postdoc","pi_tenure","think_tank","science_educator","ai_agent","funder_private"]'::jsonb);
```

### Frontend changes

| File | Change |
|------|--------|
| `src/pages/AdminPage.tsx` | Wrap existing content in a `Tabs` component with two tabs: **Activity** (current dashboard) and **Settings** (new). Settings tab shows a checkbox grid of all sub-personas from `SUB_PERSONA_REGISTRY`, grouped by parent. Fetches current value from `app_settings` on mount, updates on toggle. Only admins see the page (existing guard). |
| `src/pages/PaperViewPage.tsx` | Remove `PersonaSelectionStep` render gate, `needsPersonaSelection`, `personasConfirmed`, `savingPersonas` state. When a paper has no/default personas, fetch `app_settings.default_personas` and auto-assign them. |
| `src/components/researcher-home/UploadSection.tsx` | On new paper creation, fetch `app_settings.default_personas` and set as `selected_personas`. |

### Flow
```text
Admin → /admin → Settings tab → toggle persona checkboxes → saved to app_settings
User uploads paper → reads app_settings.default_personas → sets on paper → skips selection
User opens paper → personas already set → renders directly
```

