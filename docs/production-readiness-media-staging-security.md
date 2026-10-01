# Production readiness — media staging security

## Production invariant (launch gate)

The `content-media` bucket is **intentionally public**. Treat **every object written there as publishable public content**.

**No application path may write an AI-generated asset to `content-media` unless that path has already passed:**

1. **Authorization** — operational scoped auth, org/workspace membership, asset access via `getAuthorizedMediaAsset`.
2. **Approval** — `assertContentApprovedForPublishing` when publishing linked content.
3. **Media-type rules** — `assessAiMediaAssetForPublishing` (image-only today, bucket/path, edit-spec limits).
4. **Asset linkage** — `verifyPublishMediaAssetForContent` (asset ID must appear on the content’s `studio_visual`).

`mediaAssetId` without `contentId` is rejected. Prepare/campaign flows never write to `content-media`.

Manual user uploads (`POST /api/publishing/media`) are a separate, non-AI path: authenticated org-scoped upload of files the user explicitly chose to attach.

When production spot-checks below pass, **stop feature development** and proceed to deployment, configuration, and real-world smoke testing.

---

## Architecture (two buckets)

| Bucket | Visibility | Purpose |
|--------|------------|---------|
| `generated-media` | **Private** (`public = false`). RLS: org members only. | AI-generated and edited assets; served via **signed URLs** (`GET /api/ai/media/assets/[id]/url`). |
| `content-media` | **Public read** (`public = true`). Required for Meta Graph API. | Intentionally publishable copies only. |

Private generated files must **never** be exposed via `/storage/v1/object/public/generated-media/...`. Migration `040` keeps that bucket non-public.

## Write paths to `content-media`

| Path | AI? | Gates |
|------|-----|--------|
| `POST /api/publishing/media` | No | `requireOperationalScopedAuth`, org folder in path, file validation |
| `stageAiMediaAssetForPublishing` | **Yes** | Only from `createScheduledPostRecord` after all four invariant checks |

## When AI data becomes public

On `POST /api/publishing/schedule` or `/api/publishing/publish` with `mediaAssetId`:

1. `contentId` required.
2. Content approval (if approval record exists).
3. Asset linked on content `studio_visual`.
4. Assess + stage (copy to `content-media`).

`POST /api/creative/campaign-prepare` does **not** write to `content-media`.

## Production spot-checks

- [ ] Supabase: `generated-media` **not** public; `content-media` public read only.
- [ ] Unsigned URL to a `generated-media` path returns 403/404.
- [ ] Network: no `content-media` upload until schedule/publish with `mediaAssetId`.
- [ ] API: `mediaAssetId` without `contentId` returns 400.
- [ ] Orphan `content-media` objects — note for post-launch lifecycle cleanup.
- [ ] Monitor `campaign-prepare` and publishing routes in production.

## Client trust boundaries

- Do not rely on client-supplied `mediaUrl` for AI assets; use `mediaAssetId` and server staging.
- Asset IDs alone are insufficient without content linkage and authorization.

## Related code

- `src/lib/publishing/assess-ai-asset.ts`
- `src/lib/publishing/stage-ai-asset.ts`
- `src/lib/publishing/verify-content-media.ts`
- `src/lib/publishing/service.ts` (`createScheduledPostRecord`)
- `supabase/migrations/005_publishing.sql`, `040_ai_media_infrastructure.sql`
