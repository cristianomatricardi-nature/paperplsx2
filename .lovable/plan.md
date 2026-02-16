

## Simulate Lab Inventory from Paper Context

### What it does

When entering the Replication Assistant for a paper and the user has no lab inventory, instead of just showing "Go to Digital Lab", we add a **"Simulate a Lab"** button. Clicking it calls a new edge function that:

1. Reads the paper's metadata (field, subfield, title) and methods (tools, reagents, software) from `structured_papers`
2. Sends this to OpenAI asking it to generate a realistic but **partially overlapping** lab inventory for that research field -- some items match the paper's needs, some don't, creating an interesting gap analysis scenario
3. Inserts the generated items into `digital_lab_inventory` for the current user
4. Refreshes the page to show the Replication Assistant comparison

### User flow

```text
Replication Assistant (empty lab)
  "Set Up Your Digital Lab"
  [ Go to Digital Lab ]  [ Simulate a Lab ]
                              |
                         click ↓
                    Loading spinner...
                    "Generating lab for Molecular Biology..."
                              |
                         ↓ done
                    Page reloads with 10-15 items
                    Gap analysis now visible
```

### Technical details

**1. New edge function: `supabase/functions/simulate-lab/index.ts`**

- Accepts `{ paper_id, user_id }` in the request body
- Fetches `structured_papers.metadata` and `structured_papers.methods` for that paper
- Extracts the field/subfield and all tools/reagents/software mentioned in the methods
- Calls OpenAI (using existing `OPENAI_API_KEY` secret) with a prompt like:

> "You are a lab manager. Given a research paper in the field of {field}, generate a realistic lab inventory of 12-18 items. Include some items that match these paper requirements: {tools list}. Also include items typical for this field that are NOT in the paper. Return JSON array with: item_name, item_type (instrument/reagent/software/consumable), manufacturer, model_number, description."

- Inserts all generated items into `digital_lab_inventory` with the user's ID
- Returns the count of items created

**2. Update `supabase/config.toml`**

- Add `[functions.simulate-lab]` with `verify_jwt = false`

**3. Update `src/pages/ReplicationAssistantPage.tsx`**

- In the "empty lab" card, add a second button: "Simulate a Lab"
- On click, call `supabase.functions.invoke('simulate-lab', { body: { paper_id, user_id } })`
- Show a loading state with a message like "Generating lab inventory..."
- On success, invalidate the `lab-inventory` query to refresh the page
- On error, show a toast

**4. Update `src/lib/api.ts`** (optional)

- Add a `simulateLab(paperId, userId)` helper function

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/simulate-lab/index.ts` | New edge function -- reads paper context, calls OpenAI, inserts lab items |
| `supabase/config.toml` | Add `[functions.simulate-lab]` entry |
| `src/pages/ReplicationAssistantPage.tsx` | Add "Simulate a Lab" button with loading state in the empty-lab card |

### What stays the same

- Digital Lab page (manual CRUD still works)
- Replication Assistant comparison logic
- All existing hooks and components

