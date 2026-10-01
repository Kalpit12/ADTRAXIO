# Phase 21.6 — AI Media Editor

Lightweight, non-destructive editing for generated and imported creative assets. This is **not** a full Canva/CapCut replacement.

## Architecture

- **Route:** `/create/editor/[assetId]` (existing app shell)
- **Bootstrap API:** `GET /api/ai/media/assets/[assetId]/editor` — authorized asset metadata + signed preview URL
- **Save API:** `POST /api/ai/media/assets/[assetId]/edits` — validates operations, creates a **new** `ai_media_assets` row
- **Libraries:** `src/lib/media-editor/*` (types, validation, history, client preview, canvas render)
- **Persistence:** Migration `042_media_editor.sql` adds `source_asset_id` and `edit_spec` on `ai_media_assets`

## Non-destructive model

Original assets are never overwritten. Each save creates a derived asset:

```json
{
  "version": 1,
  "sourceAssetId": "<original-uuid>",
  "mediaType": "image|video|audio",
  "operations": [ ... ]
}
```

Lineage: Original → Edited v1 → Edited v2 via `source_asset_id` chaining (`resolveRootSourceAssetId`).

## Supported operations

| Media | Operations |
|-------|------------|
| Image | crop, resize, aspect ratio, text overlay, brightness, contrast |
| Video | trim, volume, aspect ratio (spec), text overlay (spec) |
| Audio | trim, volume |

**Not implemented:** transitions, keyframes, masks, multi-track timeline, effects marketplace, publishing.

## Edit history & UI state

- States: `draft`, `dirty`, `saved`, `rendering`, `failed`
- Command history with bounded undo/redo (`MAX_HISTORY = 50`)
- Reset clears operations without touching the source file

## Autosave / recovery

- Dirty editor state stored in `localStorage` (`adly_media_editor_draft_<assetId>`)
- Restored after refresh when draft `version` > last saved version
- Cleared on successful save
- Stale drafts cannot replace newer saved state

## Rendering strategy

| Media | Preview | Persisted output |
|-------|---------|------------------|
| Image | CSS filter + canvas overlay; export via `canvas.toBlob` in browser | New PNG uploaded server-side (admin storage); credentials stay on server |
| Video / audio | Native `<video>` / `<audio>` with trim loop + volume | **Edit specification only** — same storage object referenced; playback applies trim/volume in-app until a server transcode path exists |

We do not pretend a re-encoded file exists when only a spec was saved.

## Storage & security

- Reuses `generated-media` bucket, signed URLs (`/api/ai/media/assets/[assetId]/url`)
- `getAuthorizedMediaAsset` enforces organization + client workspace on every editor/save call
- Cross-workspace asset IDs are rejected

## Creative Studio integration

- **Edit asset** on ready slots → `/create/editor/[assetId]?return=/create/creative&slotId=...`
- After save, returns to Creative Studio with `editedAssetId` applied to the slot; original asset row remains in the database

## Tests

```bash
npm run test:phase21-6-editor
```

Covers auth hooks, isolation, operation validation, history, draft recovery, lineage, and 21.2–21.5 parsing compatibility.

## Limitations

- No full timeline editor, transitions, advanced filters, or color grading
- Video/audio export is spec-first (no FFmpeg pipeline in this phase)
- No publishing or campaign automation
- **Phase 21.7 was NOT started**
