# Phase 21.1 — AI Media Infrastructure

Infrastructure-only layer for image, video, and audio generation. No Content Studio UI or media editor in this phase.

## Architecture

Application code calls **provider abstractions** under `src/lib/ai/media/providers/`. Routes and services never import provider SDKs directly.

| Media type | Default provider | Interface |
|------------|------------------|-----------|
| Image | OpenAI | `ImageProvider.generateImage` |
| Video | Google (Veo) | `VideoProvider.startVideoGeneration` / `pollVideoGeneration` |
| Speech | ElevenLabs | `SpeechProvider.generateSpeech` |
| Sound effects | ElevenLabs | `SoundProvider.generateSoundEffect` |

Registry: `getMediaProviderRegistry()` — tests may inject mocks via `setMediaProviderRegistry()`.

## Generation lifecycle

1. Client `POST` `/api/ai/media/{image|video|speech|sound}` with prompt/text (authenticated, workspace-scoped).
2. Server creates `ai_media_generation_jobs` row (`queued`).
3. Background processing moves job to `processing`, calls the provider, uploads output to Supabase Storage, creates `ai_media_assets`, sets job `completed` (or `failed`).
4. Long-running video may stay `processing` with `provider_job_id` until polled via `GET /api/ai/media/jobs/[jobId]`.

Statuses: `queued` → `processing` → `completed` | `failed` | `cancelled`.

## Storage

- Bucket: `generated-media` (private, not public by default).
- Path pattern: `generated/{organizationId}/{workspaceId|_org}/{mediaType}/{assetId}.{ext}`

## Database

Migration `040_ai_media_infrastructure.sql`:

- `ai_media_generation_jobs` — async job state, idempotency key per organization
- `ai_media_assets` — stored file metadata
- `ai_media_usage_events` — usage metadata (no invented pricing)

RLS follows existing org-member + `user_can_access_client_workspace` patterns.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/ai/media/image` | Image job |
| GET/POST | `/api/ai/media/video` | Video job |
| GET/POST | `/api/ai/media/speech` | TTS job |
| GET/POST | `/api/ai/media/sound` | Sound effect job |
| GET | `/api/ai/media/jobs/[jobId]` | Job status (+ video poll) |

Responses return safe `job` objects only (no provider secrets or raw SDK payloads).

## Environment variables (server-only)

| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI (shared with text; do not duplicate config) |
| `OPENAI_IMAGE_MODEL` | Optional image model (default `gpt-image-1`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` | Google Veo |
| `GOOGLE_VIDEO_MODEL` | Optional (default `veo-2.0-generate-001`) |
| `ELEVENLABS_API_KEY` | ElevenLabs speech & sound |

Never expose these to client components. See `.env.example` for names only.

## Errors

Normalized categories in `src/lib/ai/media/errors.ts`:

`configuration_error`, `authentication_error`, `rate_limited`, `invalid_request`, `content_policy`, `timeout`, `provider_error`, `storage_error`, `unknown_error`.

User-facing messages never include API keys, stack traces, or raw SDK errors.

## Idempotency

Optional `idempotencyKey` on POST bodies. Duplicate keys for the same organization return the existing job instead of creating a new provider call.

## Usage tracking

`recordMediaUsageEvent` writes `ai_media_usage_events` with provider, model, and units when available. `estimated_cost_usd` is only set when explicitly supplied (no invented pricing).

## Tests

```bash
npm run test:phase21-1-media
```

Uses mocked `fetch` for OpenAI image — **no real Veo, ElevenLabs, or paid API calls in CI**.

## Adding a provider later

1. Implement the relevant interface in `providers/`.
2. Register in `providers/registry.ts`.
3. Map errors through `normalizeProviderError`.
4. Extend migration checks/enums if needed.
5. Add mocked adapter tests.

Replicate and additional providers are out of scope for 21.1.

## Content Studio integration (21.2+)

Phase 21.2 adds Content Studio image UI and `GET /api/ai/media/assets/[assetId]/url` for signed delivery of private `generated-media` objects. See `docs/phase-21-2-ai-image-generation.md`.

## Out of scope (later phases)

- Video/voice UI (21.3+)
- Content Studio redesign
- Production deployment changes
- Automatic retries / cron poller (basic poll on job GET only)
