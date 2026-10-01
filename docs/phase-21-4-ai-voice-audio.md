# Phase 21.4 — AI Voice & Audio

Voice narration and sound effects in Content Studio via ElevenLabs providers from Phase 21.1.

## Architecture

| Mode | Provider | API |
|------|----------|-----|
| Voice | `SpeechProvider` (ElevenLabs TTS) | `POST /api/ai/media/speech` |
| Sound | `SoundProvider` (ElevenLabs sound generation) | `POST /api/ai/media/sound` |

Shared: `GET /api/ai/media/jobs/[jobId]`, `GET /api/ai/media/assets/[assetId]/url`, `ai_media_*` tables, private `generated-media` storage, `recordMediaUsageEvent()`.

## Content Studio

`StudioVisualPanel` → **Media** section with **Image | Video | Voice | Sound**.

- **Voice:** script text, default narrator preset (`21m00Tcm4TlvDq8ikWAM`).
- **Sound:** description + duration (3 / 5 / 10 seconds).

Metadata in `studioVisual`:

- `type: "image" | "video" | "audio"`
- `audioSubtype: "voice" | "sound"` when `type === "audio"`
- Legacy image/video drafts unchanged (missing `type` defaults to image).

## Job lifecycle & polling

`waitForAudioJob` — bounded polling, abort on unmount, processing status copy, no fake progress.

## Regeneration

Text/description edits only — not audio editing or timeline.

## Validation

`parseSpeechGenerationBody` / `parseSoundGenerationBody` — length limits, whitelisted voice IDs and sound durations, rejects unsupported model fields.

## Tests

```bash
npm run test:phase21-4-audio
```

Mocked — no live ElevenLabs calls.

## Environment

`ELEVENLABS_API_KEY` (server-only).

## Limitations

- No audio editor, timeline, voice/audio publishing, or Creative Studio (21.5).
- Single supported narrator preset in UI (matches adapter default).
- **Phase 21.5 NOT started.**
