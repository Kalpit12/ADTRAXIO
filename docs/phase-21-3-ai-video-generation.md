# Phase 21.3 — AI Video Generation (Content Studio)

Video generation for Content Studio, built on Phase 21.1 infrastructure and alongside Phase 21.2 images.

## Architecture

- **Provider:** `GoogleVideoProvider` via `getMediaProviderRegistry().video` — no client-side Veo/SDK usage.
- **Jobs:** `ai_media_generation_jobs` (async `processing` + `provider_job_id` for long runs).
- **Assets:** `ai_media_assets` in private `generated-media` bucket.
- **Usage:** `ai_media_usage_events` on completion (no invented pricing).

No new tables in 21.3 — migrations 040/041 remain sufficient.

## Content Studio integration

`StudioVisualPanel` includes **Image | Video** mode:

- Video: prompt, aspect ratio (`16:9`, `9:16`, `1:1`), duration (4 / 6 / 8 seconds).
- Status: **Creating your video…** → **Processing your video…** (when job is `processing`).
- Native `<video controls>` preview; signed URL refresh on error (expired URL).
- `studioVisual` metadata extended with `type: "image" | "video"` per asset (legacy image drafts default to `image`).

## API flow

1. `POST /api/ai/media/video` — auth, workspace scope, validation, idempotency, queue job.
2. `GET /api/ai/media/jobs/[jobId]` — poll status (triggers provider poll for async video).
3. `GET /api/ai/media/assets/[assetId]/url` — signed URL for video or image (same as 21.2).

## Polling (client)

`waitForVideoJob` in `visual-client.ts`:

- Bounded attempts (default 120 × 3s).
- `AbortSignal` cleanup on unmount.
- Retries transient 5xx on status fetch.
- `onStatus` callback for processing UI.
- No duplicate pollers per component instance (`activeRequestRef` + abort previous).

## Validation

Centralized in `parseVideoGenerationBody`:

- Prompt length (shared max).
- Whitelisted aspect ratios and durations.
- Rejects unsupported reference-image fields.

## Variation / regenerate

Prompt-based only — not timeline/frame editing. UI states this explicitly.

## Billing

Existing media usage recording only. No new plan limits.

## Tests

```bash
npm run test:phase21-3-video
npm run test:phase21-2-image
npm run test:phase21-1-media
```

Mocked `fetch` — **no real Veo calls in CI**.

## Environment

`GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`, optional `GOOGLE_VIDEO_MODEL`.

## Limitations

- No video editor, voice/audio, or publishing video attachments.
- No reference image input (adapter does not support it yet).
- Live generation requires real Google credentials.
- **Phase 21.4 has NOT been started.**
