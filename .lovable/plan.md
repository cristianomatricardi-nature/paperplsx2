

# Audio Summary Hooks — Script + TTS Pipeline

## Overview

Add a persona-specific ~30-second audio "hook" to the Personalized Summary card. Follows the same fire-and-poll background job pattern as infographic generation. Two-step pipeline: **Step 1** generates a spoken script via OpenAI (GPT-5), **Step 2** converts it to speech via ElevenLabs TTS. The audio MP3 is stored in Supabase storage and cached for instant replay.

## Prerequisites

**ElevenLabs API Key**: No key exists yet. We'll use the ElevenLabs connector to set up the connection and get `ELEVENLABS_API_KEY` as a secret.

## Architecture

```text
PersonalizedSummaryCard [▶ Play button]
       │ (on summary load, auto-trigger)
       ▼
  Edge Function: generate-audio-hook (fire & poll)
       │
       ├─ Step 1: Script Generation (OpenAI GPT-5)
       │    Input: cached modules (persona-specific selection)
       │    Output: ~75-word spoken hook script + 2-3 CTA bullets
       │
       ├─ Step 2: TTS (ElevenLabs API)
       │    Input: script text
       │    Output: MP3 binary → stored in paper-figures bucket
       │
       └─ Update audio_hook_jobs table with status + audio_url
       
  Client polls audio_hook_jobs → plays cached MP3
```

## Step 1: Script Generation — Persona-Specific Design

Each sub-persona uses different modules as input and gets a unique hook + CTA structure:

| Sub-Persona | Modules Used | Hook Focus | CTA Examples |
|---|---|---|---|
| **phd_postdoc** | M1, M2, M3, M5 | Deep methods, reproducibility | "Reproduce this protocol", "Combine with your dataset", "Share with your supervisor" |
| **pi_tenure** | M1, M2, M5 | Strategic positioning, grants | "Write a collaboration proposal", "Use this in your next grant", "Contact the corresponding author" |
| **think_tank** | M1, M2, M5 | Policy evidence, impact | "Cite in your next policy brief", "Commission a follow-up analysis" |
| **gov_institution** | M1, M5 | Decision-ready, scale of impact | "Brief your minister", "Request a departmental review" |
| **funder_governmental** | M1, M2, M5 | ROI, portfolio fit | "Flag for next funding round", "Compare against portfolio" |
| **funder_private** | M1, M2, M5 | Mission alignment, scalability | "Add to pipeline review", "Commission due diligence" |
| **industry_rd** | M1, M2, M3 | Commercial potential, TRL | "Initiate licensing discussion", "Scout the research team" |
| **science_educator** | M2, M3, M6 | Teaching hooks, engagement | "Design a lesson plan", "Create a classroom demo", "Share with your department" |

The script prompt will inject all persona variables (jargonLevel, languageStyle, contentGoal, numberPolicy, depthPreference) from the `SUB_PERSONA_REGISTRY` to ensure the audio matches the written summary tone.

Script output structure (via tool calling):
```json
{
  "hook_script": "In 75 words, this research reveals...",
  "call_to_actions": [
    "Reproduce the acidification protocol in your lab using the step-by-step guide in Methods",
    "Cross-reference the pH trajectory data with your own coastal monitoring dataset",
    "Share this analysis with your research group lead"
  ]
}
```

The final spoken text concatenates the hook + CTAs into a natural ~30s spoken script.

## Step 2: TTS via ElevenLabs

- Voice: "George" (`JBFqnCBsd6RMkjVDRZzb`) — authoritative, clear
- Model: `eleven_multilingual_v2`
- Output: MP3 stored in `paper-figures` bucket as `audio-hooks/{paperId}_{subPersonaId}.mp3`

## Database Changes

New table `audio_hook_jobs`:

```sql
CREATE TABLE public.audio_hook_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id BIGINT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  sub_persona_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  audio_url TEXT,
  script TEXT,
  call_to_actions JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paper_id, sub_persona_id)
);

ALTER TABLE public.audio_hook_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audio hook jobs"
  ON public.audio_hook_jobs FOR SELECT
  TO authenticated USING (true);
```

## Files to Create/Modify

1. **`supabase/functions/generate-audio-hook/index.ts`** — New edge function (fire-and-poll pattern)
2. **`src/components/paper-view/PersonalizedSummaryCard.tsx`** — Add play button, poll logic, audio playback
3. **`src/lib/api.ts`** — Add `generateAudioHook()` and `pollAudioHookJob()` functions
4. **Database migration** — Create `audio_hook_jobs` table

## UI in PersonalizedSummaryCard

- Small speaker icon button next to "Personalized Summary" title
- States: idle → generating (spinner) → ready (play/pause) → playing (animated waves)
- Auto-triggers generation when summary loads (pre-generate)
- If cached audio exists (job complete), shows play button immediately
- Audio plays inline via HTML5 Audio API

## Trigger Flow

1. When summary loads successfully, check if `audio_hook_jobs` has a completed job for this paper+persona
2. If yes → show play button with cached `audio_url`
3. If no → call `generate-audio-hook` edge function (fire), then poll for completion
4. On completion → fetch MP3 URL, show play button

