

# Clean Up Policy Tags in Summary Card

## Problem

The policy tags section currently mixes two different things:
1. **Policy areas** — short topic labels like "Ocean and coastal management", "Climate mitigation" (these are good)
2. **Suggested policy contexts** — long program/initiative names like "U.S. Federal Ocean Acidification Research And Monitoring (FOARAM) Act..." (these are NOT policy areas, they're programs/initiatives and they clutter the UI)

Both are rendered as badges in the same row, making it confusing and space-heavy.

## Solution

**Remove the `suggested_policy_contexts` badges entirely from the policy areas row.** Keep only the actual `policy_areas` badges (the short topic labels).

The policy contexts data is still useful — it's already shown in the popover when hovering a policy area badge (via the `getContextForArea` matching logic). So the information isn't lost, it's just not cluttering the main view anymore.

## Change

**File: `src/components/paper-view/PersonalizedSummaryCard.tsx`**
- Remove lines 153-177 (the `policyTags.suggested_policy_contexts.map(...)` block that renders the outline badges with arrows)
- Keep the `policy_areas` badges with their existing hover popovers

Result: A clean row showing only "Policy areas: `Ocean and coastal management` `Climate mitigation` `Fisheries and aquaculture`" — short, scannable, focused.

