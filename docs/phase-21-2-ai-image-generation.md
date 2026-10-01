# Phase 21.2 — AI Image Generation (Content Studio)

Connects Phase 21.1 media infrastructure to Content Studio for **images only**.

## User flow

1. Open **Content Studio** (`/create`).
2. In the **Visual** section, describe the image (defaults from creative direction or topic).
3. Choose aspect ratio (square, portrait, landscape).
4. **Create visual** → job is queued and processed asynchronously.
5. UI shows **Creating your visual…** (no fake progress percentages).
6. On success, preview the image with actions:
   - **Generate variation**
   - **Edit description** + **Regenerate with edits** (prompt-based)
   - **Use for content** (shows in text preview)
   - **Save visual** (saves draft including `studioVisual` metadata)
7. **Save draft** persists copy + visual asset references (Supabase `content.studio_visual` or localStorage).

## API routes

| Route | Role |
|-------|------|
| `POST /api/ai/media/image` | Start image job (21.1) |
| `GET /api/ai/media/jobs/[jobId]` | Poll status (internal to client helper) |
| `GET /api/ai/media/assets/[assetId]/url` | Signed URL for private `generated-media` |

Client helpers: `src/lib/content/visual-client.ts`.

## Provider usage

Uses `getMediaProviderRegistry().image` (OpenAI) — no direct SDK calls from UI.

Supported sizes: `1024x1024`, `1024x1792`, `1792x1024` (validated server-side).

## Storage & asset lifecycle

1. Job completes → binary uploaded to `generated-media` (private).
2. `ai_media_assets` row created; job references `mediaAssetId`.
3. UI fetches short-lived signed URL via authenticated asset route.
4. `studio_visual` on content draft stores `{ activeAssetId, assets[] }` (asset IDs + prompts only).

Local persistence: `adly_content_studio_visuals` in localStorage keyed by draft or session so refresh does not drop in-progress visuals.

## Errors

UI maps 21.1 categories via `friendlyVisualErrorMessage()` — no raw provider text.

## Billing / usage

`ai_media_usage_events` recorded by 21.1 service on completion. No new plan limits in 21.2.

## Tests

```bash
npm run test:phase21-2-image
npm run test:phase21-1-media
```

Mocked — no paid OpenAI calls in CI.

## Known limitations

- No true inpainting/edit API — edits are prompt-based regeneration.
- Signed URLs expire (~1 hour); preview refreshes on attach.
- Video, voice, and media editor are out of scope (Phase 21.3+).
- Requires migration `041_content_studio_visual.sql` and `040` media tables for full persistence.

## Out of scope

Video (Veo), ElevenLabs UI, timeline editor, Creative Studio redesign, Replicate, deployment changes.
