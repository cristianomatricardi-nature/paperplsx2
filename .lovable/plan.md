
# Add Audio Brief Cards to Educator and Funder Views

## Overview

Add an "Audio Brief" card to both the Educator and Funder views. Each card generates a narrated summary using ElevenLabs TTS, with the script sourced from the paper's own Discussion/Introduction sections (via existing RAG chunks and liquefaction data -- no external search needed).

## How It Works

1. **Script Generation**: A new edge function (`generate-audio-brief`) takes the existing liquefaction payload (already cached) and composes a 2-3 minute narration script using GPT-4o. For Educators, it contextualizes the paper within the field using references the paper itself cites. For Funders, it produces a concise executive accountability summary.

2. **TTS Narration**: The same edge function sends the script to ElevenLabs TTS and returns base64 audio. The audio is cached in the `generated_content_cache` table so it's only generated once per paper/persona.

3. **Frontend Card**: A reusable `AudioBriefCard` component with play/pause controls, a waveform-style progress indicator, and a collapsible transcript.

## Prerequisites

ElevenLabs is available as a connector. We need to connect it first so the `ELEVENLABS_API_KEY` secret is available in edge functions.

---

## Step 1: Connect ElevenLabs

Use the ElevenLabs connector to link an API key to this project. This provides the `ELEVENLABS_API_KEY` secret for edge functions.

## Step 2: Edge Function -- `generate-audio-brief`

**File:** `supabase/functions/generate-audio-brief/index.ts`

This function:
- Accepts `{ paper_id, persona_type: 'educator' | 'funder', sub_persona_id }`
- Checks cache (`content_type = 'audio_brief_educator'` or `'audio_brief_funder'`)
- If not cached:
  1. Fetches the already-cached liquefaction payload (educator_view or funder_view) from `generated_content_cache`
  2. Fetches paper metadata (title, abstract)
  3. Calls GPT-4o with a narration prompt:
     - **Educator script**: "You are a science communicator narrating a 2-minute field context briefing for educators. Summarize what this paper found, why it matters in the field, and how it connects to related work mentioned in the paper's own references. Use accessible language."
     - **Funder script**: "You are a grant reviewer narrating a 1-minute executive briefing. Cover: what was funded, what was achieved (aims met/partial/not met), confidence level, and key outputs. Be factual and concise."
  4. Sends the generated script to ElevenLabs TTS (`POST /v1/text-to-speech/{voiceId}`) using a professional voice (e.g., "Brian" for Funder, "Alice" for Educator)
  5. Base64-encodes the audio and caches both the script text and audio in `generated_content_cache`
- Returns `{ script, audio_base64, duration_estimate }`

**Config:** Add to `supabase/config.toml`:
```text
[functions.generate-audio-brief]
verify_jwt = false
```

## Step 3: API + Hook

**File:** `src/lib/api.ts` -- add `fetchAudioBrief(paperId, personaType, subPersonaId)`

**File:** `src/hooks/useAudioBrief.ts` -- new hook managing loading/error/audio state with:
- `script` (string) -- the narration text
- `audioBase64` (string) -- base64-encoded MP3
- `loading`, `error`, `refetch`
- `isPlaying`, `play()`, `pause()` -- audio playback controls using `HTMLAudioElement`

## Step 4: Frontend Component

**File:** `src/components/paper-view/views/AudioBriefCard.tsx`

A reusable card component used in both views:
- Props: `paperId`, `personaType: 'educator' | 'funder'`, `subPersonaId`
- Uses `useAudioBrief` hook
- Layout:
  - Card with a headphone/volume icon and title ("Field Context Brief" for Educator, "Executive Audio Brief" for Funder)
  - Play/Pause button with a simple progress bar
  - Duration estimate label
  - Collapsible "Read transcript" section showing the script text
  - Loading state: skeleton with "Generating audio brief..." message
  - Error state with retry button

## Step 5: Wire Into Views

**File:** `src/components/paper-view/views/EducatorView.tsx`
- Add `AudioBriefCard` after the hero card (SimplifiedExplanation), before the 2-column grid
- Props: `personaType="educator"`

**File:** `src/components/paper-view/views/FunderView.tsx`
- Add `AudioBriefCard` after the header strip, before the Aim Attainment Grid
- Props: `personaType="funder"`

---

## File Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/generate-audio-brief/index.ts` |
| Create | `src/hooks/useAudioBrief.ts` |
| Create | `src/components/paper-view/views/AudioBriefCard.tsx` |
| Edit | `src/lib/api.ts` |
| Edit | `src/components/paper-view/views/EducatorView.tsx` |
| Edit | `src/components/paper-view/views/FunderView.tsx` |
| Edit | `supabase/config.toml` |

## Notes

- The narration script is derived entirely from the paper's own content (existing liquefaction payload), so no external literature search is needed. The Discussion section typically contains the field context and related work references.
- Audio is cached after first generation, so subsequent visits play instantly.
- ElevenLabs TTS produces high-quality narration (~128kbps MP3). A 2-minute script is roughly 1.5MB base64.
