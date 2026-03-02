

# Add "Clear Lab" Button to Digital Lab

## Change

Edit `src/pages/DigitalLabPage.tsx` to add a "Clear Lab" button in the header bar (next to "Add Item") that deletes all inventory items for the current user after confirmation.

### Details

- Add a destructive-styled "Clear Lab" button with a `Trash2` icon, visible only when items exist
- Reuse the existing `AlertDialog` pattern already in the file for delete confirmation
- On confirm, run `supabase.from('digital_lab_inventory').delete().eq('user_id', user.id)` to remove all rows
- Optimistically clear local `items` state; rollback on error
- Show a toast on success/failure

### File changed

| File | What |
|------|------|
| `src/pages/DigitalLabPage.tsx` | Add "Clear Lab" button + confirmation dialog in header |

