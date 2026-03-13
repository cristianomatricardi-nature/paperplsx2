

# Fix "What To Do Now" Card When No Library Papers Exist

## Problem

The "What To Do Now" summary card always renders — even when you have zero papers in your library. The edge function (lines 228-247 of `generate-summary/index.ts`) queries for your other papers, finds none, and the LLM just generates generic next steps pretending it knows your work. That's misleading.

## Solution

Two changes:

### 1. Edge function: `supabase/functions/generate-summary/index.ts`
- When `userPapers` is empty (length 0), do NOT pass `researcherContext` to the prompt composer — this already happens correctly
- But also: add a `personalized: boolean` flag to the response so the frontend knows whether the "next" card is actually personalized or generic

### 2. Frontend: `src/components/paper-view/PersonalizedSummaryCard.tsx`
- On the "What To Do Now" slide, if `personalized` is false (no library papers were available), show a subtle info banner: *"Add papers to your library from the Hub to get personalized next steps based on your own research."*
- The generic next steps from the LLM still display, but the user understands they're not based on their work

### 3. Prompt composer: `supabase/functions/_shared/prompt-composers.ts`
- When `researcherContext` is absent, update the "next" card instruction to say: "Provide general actionable next steps for any researcher in this field. Do NOT pretend to know the reader's own work."

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-summary/index.ts` | Add `personalized: true/false` to response JSON |
| `supabase/functions/_shared/prompt-composers.ts` | Clarify "next" card instruction when no researcher context |
| `src/components/paper-view/PersonalizedSummaryCard.tsx` | Show info banner on "next" slide when not personalized |

