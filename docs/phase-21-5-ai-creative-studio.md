# Phase 21.5 — AI Creative Studio

Unified workflow composing image, video, voice, and sound primitives from Phases 21.1–21.4.

## Route

`/create/creative` — entry from Content Studio via **Creative Studio** button.

## Workflow

1. **Brief** — reuses `CreativeBriefPanel` (no auto media).
2. **Concept** — `POST /api/ai/creative-concept` (OpenAI JSON concept).
3. **Assets** — explicit per-slot generation via existing `/api/ai/media/*` + polling.
4. **Compose** — canvas + platform structural preview (`ContentPreview`).
5. **Review** — save to Content Studio draft.

## Persistence

`content.studio_visual` JSON extended with optional `creativeStudio` snapshot (concept, slots, canvas, workflow). Existing `assets` array remains compatible with 21.2–21.4. Signed URLs are not stored permanently.

## Cost safety

No automatic image/video/voice/sound generation on page load. User triggers concept and each asset separately.

## Partial failure

One failed slot does not clear others; per-slot retry/remove.

## Limitations

- Not a timeline/video editor.
- No publishing or campaign automation.
- No autonomous multi-asset generation.
- **Phase 21.6 and 21.7 NOT started.**

## Tests

`npm run test:phase21-5-creative` (mocked/deterministic).
