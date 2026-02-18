
## Admin Dashboard: User Activity Tracker

### Overview

Build a secure, admin-only dashboard at `/admin` accessible only to Cristiona Matricardi (email: `cristiano.matricardi@gmail.com`). The page shows:
- A **summary dashboard** at the top with aggregate % stats across all users
- A **per-user activity table** with boolean flags for each tracked behavior

### Tracking Strategy

Four activity signals will be tracked via a new `user_activity_events` table. Events are inserted client-side as fire-and-forget operations at key interaction moments. The admin dashboard reads them securely via a privileged edge function.

**Events tracked:**
1. `persona_changed` — when user changes the persona selector (away from default `phd_postdoc`)
2. `protocol_opened` — when user opens any module/protocol accordion
3. `replication_used` — when user visits the Replication Assistant page
4. `analysis_used` — when user visits the Analytical Pipeline page

---

### Step 1 — Database Migrations (2 migrations)

**Migration A: Activity events table**
```sql
CREATE TABLE public.user_activity_events (
  id bigint primary key generated always as identity,
  user_id uuid not null,
  paper_id bigint references public.papers(id) on delete set null,
  event_type text not null,
  created_at timestamptz default now()
);
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events" ON public.user_activity_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events" ON public.user_activity_events
  FOR SELECT USING (auth.uid() = user_id);
```

**Migration B: User roles table + admin assignment**
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admins can read all roles (for their own verification)
CREATE POLICY "Admins can read roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Assign Cristiona as admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'cristiano.matricardi@gmail.com'
ON CONFLICT DO NOTHING;
```

---

### Step 2 — Edge Function: `admin-dashboard`

New file: `supabase/functions/admin-dashboard/index.ts`

- Validates caller JWT using `getClaims()`, then checks `has_role(userId, 'admin')` via service-role client
- If not admin → returns 403
- If admin → uses service-role client to query:
  - All profiles (name, created_at)
  - All auth users (email) via `auth.users` with service role
  - All papers (grouped by user_id)
  - All activity events (grouped by user_id + event_type)
- Computes per-user booleans and protocol % opened
- Computes summary percentages
- Returns structured JSON

---

### Step 3 — Event Tracking: 4 file changes

**`src/pages/PaperViewPage.tsx`**
- In `handlePersonaChange`: insert `persona_changed` event when persona differs from the current one (fire-and-forget, no await that blocks UX)
- In `handlePersonasConfirm`: if user selected personas other than just `['phd_postdoc']`, insert `persona_changed`

**`src/components/paper-view/ModuleAccordionList.tsx`**
- Add optional prop: `onModuleOpened?: (moduleId: ModuleId) => void`
- In `handleToggle`: when opening (not closing), call `onModuleOpened`

**`src/pages/PaperViewPage.tsx`** (same file)
- Pass `onModuleOpened` to `ModuleAccordionList` → fires insert to `user_activity_events` for `protocol_opened`

**`src/pages/ReplicationAssistantPage.tsx`**
- Add `useEffect` on mount to fire-and-forget insert of `replication_used`

**`src/pages/AnalyticalPipelinePage.tsx`**
- Add `useEffect` on mount (when `numericId` is set) to fire-and-forget insert of `analysis_used`

---

### Step 4 — Admin Page: `src/pages/AdminPage.tsx`

**Layout:**

```text
+--------------------------------------------------+
|  Admin Dashboard                 [last updated]  |
+--------------------------------------------------+
|  [Total Users: 24]  [Total Papers: 67]           |
|                                                  |
|  [ % Persona Changed ]  [ % Protocol Opened ]    |
|  [     61.9%         ]  [     45.2%         ]    |
|                                                  |
|  [ % Replication Used ] [ % Analysis Used ]      |
|  [     28.6%          ] [     19.0%        ]     |
+--------------------------------------------------+
|  USER ACTIVITY TABLE                             |
|  Name | Email | Signed Up | Papers | Persona? |  |
|       |       |           |        | Protocol?|  |
|       |       |           |        |% Opened  |  |
|       |       |           |        | Replic.? |  |
|       |       |           |        | Analysis?|  |
+--------------------------------------------------+
```

- Summary cards use a clean grid, each with a big number and label
- Table uses shadcn `Table` components
- Booleans rendered as green `✓` Badge or gray `—` text
- Protocol % shown as a small `Progress` bar + number
- Expandable rows to see paper titles (click to expand)
- A "Refresh" button to re-fetch

**Admin Guard:**
- On load, calls the edge function
- If 403 → shows "Access Denied" message
- If loading → shows spinner

---

### Step 5 — Route Registration

**`src/App.tsx`**: Add `<Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />`

---

### Files Changed Summary

| File | Action |
|------|--------|
| `supabase/migrations/[new_A].sql` | Create `user_activity_events` table + RLS |
| `supabase/migrations/[new_B].sql` | Create `app_role` enum + `user_roles` table + `has_role` function + assign Cristiona as admin |
| `supabase/functions/admin-dashboard/index.ts` | New edge function: admin validation + aggregated data |
| `supabase/config.toml` | Add `[functions.admin-dashboard]` with `verify_jwt = false` |
| `src/pages/AdminPage.tsx` | New admin dashboard page |
| `src/pages/PaperViewPage.tsx` | Fire `persona_changed` and `protocol_opened` events |
| `src/components/paper-view/ModuleAccordionList.tsx` | Add `onModuleOpened` callback prop |
| `src/pages/ReplicationAssistantPage.tsx` | Fire `replication_used` event on mount |
| `src/pages/AnalyticalPipelinePage.tsx` | Fire `analysis_used` event on mount |
| `src/App.tsx` | Register `/admin` route |

No existing data is affected. All new tables are additive. Event tracking is silent (fire-and-forget, no UX impact).
