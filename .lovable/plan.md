

# Restructure Policy Maker View UI

## Summary

Slim down the Evidence Dashboard Strip, move policy tags into the summary card, replace standalone Infographic/Brief cards with two square action buttons, and put the `relevance_reasoning` into a hovering tooltip on the relevance score.

## Changes

### 1. `EvidenceDashboardStrip.tsx`
- **Remove** the confidence bar (lines 37-48) and `relevance_reasoning` paragraph (lines 56-59)
- **Add** a `Tooltip` on the relevance score that shows `relevance_reasoning` on hover
- Keep: relevance score (big number) + `top_finding` paragraph

### 2. `PersonalizedSummaryCard.tsx`
- Add optional `policyTags` prop (type from `PolicyViewPayload['policy_tags']`)
- Render interactive policy area badges (with popover behavior from current `PolicyTagsRow`) between the narrative text and the disclaimer
- Reuse the same popover-on-badge pattern already in `PolicyTagsRow`

### 3. `PolicyMakerView.tsx` — Major restructure
New layout order:
1. `PersonalizedSummaryCard` (now receives `policyTags`)
2. `EvidenceDashboardStrip` (slimmed)
3. **Two square action buttons** side-by-side: "Generate Infographic" (ImageIcon) + "Generate Policy Brief" (FileText icon)
   - Each button triggers generation (reusing existing `handleGenerate` logic from InfographicPanel and dialog-open from PolicyBriefCard)
   - Once generated, a small clickable thumbnail/icon appears below the respective button to open the result (infographic → full-res dialog, brief → brief dialog)
4. `PolicyContentMatcher`

Remove standalone `PolicyTagsRow`, `InfographicPanel` card, and `PolicyBriefCard` card from the flow. Keep their **dialog components** (full-res image dialog, debug dialog, brief dialog) — just move the trigger logic into the new buttons section.

### 4. Files Changed
1. `src/components/paper-view/views/EvidenceDashboardStrip.tsx` — Remove confidence bar + relevance_reasoning; add tooltip on score
2. `src/components/paper-view/PersonalizedSummaryCard.tsx` — Add policyTags prop with interactive badges
3. `src/components/paper-view/views/PolicyMakerView.tsx` — Restructure layout: merged summary, slim strip, action buttons with inline result icons

