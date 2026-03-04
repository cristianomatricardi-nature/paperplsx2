

# Audio Player Bar with Waveform + Section Progress

## What We're Building

Replace the small play button with a full inline audio player bar below the summary text. The bar includes a waveform visualization that animates with the voice, and beneath it a 4-segment progress strip showing **What → Why → How → What can I do** that fills as the audio covers each topic.

## Architecture

```text
┌─ PersonalizedSummaryCard ──────────────────────────┐
│  Personalized Summary              [PersonaSelect] │
│                                                    │
│  <narrative summary text>                          │
│                                                    │
│  ┌─ Audio Player Bar ───────────────────────────┐  │
│  │  ▶/❚❚  ░░▓▓▓░░▓▓░░▓▓▓▓░░▓  0:12 / 0:28     │  │
│  └──────────────────────────────────────────────┘  │
│  ┌─ Section Progress ──────────────────────────┐   │
│  │ ████ What │ ███░ Why │ ░░░░ How │ ░░░░ Do   │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  ⚠️ AI disclaimer                                  │
└────────────────────────────────────────────────────┘
```

## Changes

### 1. Edge Function — Structured Script with Section Timestamps

Update `generate-audio-hook/index.ts`:

- Modify the GPT-5 prompt to generate the script in **4 labeled sections**: `what`, `why`, `how`, `what_can_i_do`. Each section is a short paragraph. Total spoken text stays under 30 seconds (≤75 words).
- Update the tool schema to return `sections: [{ id, text }]` instead of a flat `spoken_text`. The `spoken_text` is then concatenated from sections for TTS.
- Switch ElevenLabs to the **with-timestamps** endpoint (`/v1/text-to-speech/{voiceId}/with-timestamps`) which returns word-level alignment data alongside audio. This gives us `{ audio_base64, alignment: { chars, charStartTimesMs, charDurationsMs } }`.
- Compute section boundaries by matching each section's text offset to the character-level timestamps from ElevenLabs.
- Store in the job: `timestamps` JSONB (the alignment data) and `sections` JSONB (array of `{ id, label, start_ms, end_ms }`).
- Update CTAs: make them product-aware, guiding users to Paper++ tools (Replication Assistant, AI Agent, Analytical Pipeline, etc.) per persona.
- Tone: less number-heavy, more conversational assistant ("Here's what you could do...").

**Database migration**: Add `timestamps JSONB` and `sections JSONB` columns to `audio_hook_jobs`.

### 2. New Component — `AudioPlayerBar.tsx`

Create `src/components/paper-view/AudioPlayerBar.tsx`:

- **Play/Pause button** on the left.
- **Waveform visualization** in the center: a row of ~40 thin vertical bars whose heights animate based on `audio.currentTime`. We use the stored alignment data to detect speech energy (character density per time window) to drive bar heights. During playback, bars ahead of the playhead are muted, bars at the playhead pulse, bars behind are colored primary.
- **Time display** on the right: `0:12 / 0:28`.
- **Clickable scrubber**: clicking anywhere on the waveform seeks to that position.

### 3. New Component — `SectionProgressStrip.tsx`

Create `src/components/paper-view/SectionProgressStrip.tsx`:

- 4 equal-width segments: **What** | **Why** | **How** | **What can I do**
- Each segment has a fill bar that progresses from 0% to 100% as the audio plays through that section's time range (derived from `sections` JSONB).
- Active section label is bold/primary colored. Completed sections are fully filled. Future sections are empty.
- Clicking a section seeks the audio to that section's start time.

### 4. Update `PersonalizedSummaryCard.tsx`

- Remove the small play button from the header.
- After the narrative text and before the disclaimer, render `<AudioPlayerBar>` and `<SectionProgressStrip>` when audio is ready or playing.
- Pass down: `audioUrl`, `audioState`, `duration`, `currentTime`, `sections`, `onPlayPause`, `onSeek`.
- Track `currentTime` via `requestAnimationFrame` loop during playback.
- Show a subtle generating skeleton bar while `audioState === 'generating'`.

### 5. Update `api.ts`

- `pollAudioHookJob` returns `timestamps` and `sections` from the job record.

## Files to Create/Modify

1. `supabase/functions/generate-audio-hook/index.ts` — Section-aware script, timestamps endpoint, product CTAs, tone fix
2. `src/components/paper-view/AudioPlayerBar.tsx` — New: waveform player
3. `src/components/paper-view/SectionProgressStrip.tsx` — New: What/Why/How/Do strip
4. `src/components/paper-view/PersonalizedSummaryCard.tsx` — Integrate new components
5. `src/lib/api.ts` — Return sections + timestamps
6. Database migration — Add `timestamps` and `sections` columns

