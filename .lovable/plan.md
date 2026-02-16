

## Remove "Why This Matters" Section from Personalized Summary Card

**File: `src/components/paper-view/PersonalizedSummaryCard.tsx`** (lines 113-116)

Delete the entire paragraph block that displays `content.why_this_matters`:

```tsx
// Remove these lines entirely:
<p className="text-sm italic text-muted-foreground leading-relaxed">
  <span className="font-semibold not-italic text-foreground">Why this matters for you: </span>
  {content.why_this_matters}
</p>
```

One block removed, no other files affected.

