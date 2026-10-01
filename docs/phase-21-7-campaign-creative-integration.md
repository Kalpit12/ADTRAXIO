# Phase 21.7 — Campaign Creative Integration

Connects **Creative Studio** outputs to existing **Campaigns**, **Content**, **Approval**, and **Publishing** systems. No new engines were introduced.

## Creative Studio → campaign flow

1. On the **Review** step, use **Add to campaign**.
2. Select an existing campaign (or **Create campaign** → `/campaigns/new`).
3. Choose publishing media (ready **image** or **video** slot).
4. **Prepare for publishing** → `POST /api/creative/campaign-prepare`
   - Creates a `content` row with copy, hashtags, and `studio_visual` (asset IDs + `creativePublishing` link).
   - Attaches content via `campaign_content`.
   - Validates image assets for publishing (no public copy at prepare time).
5. **Schedule / publish** opens the existing `PublishPanel`, calling `/api/publishing/schedule` or `/api/publishing/publish`.

## Content conversion

- Copy from concept + compose canvas (headline, caption, CTA, hashtags).
- `studio_visual.assets` holds `ai_media_assets` IDs.
- `studio_visual.creativePublishing`: `{ campaignId, contentId, selectedMediaAssetId, updatedAt }`.
- Voice/sound slots are stored as supplementary metadata only.

## Media references & lineage

- Publishing uses the **selected final** asset ID (including edited assets).
- **Prepare** only validates assets (`assess-ai-asset.ts`) — no public copy at prepare time.
- **Schedule / publish** copies **image** bytes into public `content-media` inside `createScheduledPostRecord` (after approval checks). Original `generated-media` objects stay private.
- See `docs/production-readiness-media-staging-security.md` for the full security model and launch checklist.
- **Video** publishing: blocked with “Publishing this media type is not available yet.” (existing platform capabilities).
- **Trimmed video/audio** (spec-only edits from 21.6): blocked with an explicit limitation message.

## Approval integration

- Uses `getLatestContentApproval` and existing `assertContentApprovedForPublishing` on schedule/publish.
- Creative Studio does not bypass approval; `PublishPanel` shows block reason and disables submit when approval is pending/rejected/changes requested.

## Accounts & permissions

- Social accounts loaded via `/api/social/accounts` (existing).
- Prepare requires `campaigns.edit` and `content.edit`; publishing uses existing operational auth on publishing routes.

## Scheduling & publish now

- No `/api/creative/publish` — payloads go to existing publishing APIs.
- Campaign association remains on `campaign_content`; scheduled posts link via `content_id` (unchanged analytics path).

## Status display

Lifecycle labels derive from approval + publishing states: draft, ready, awaiting approval, scheduled, publishing, published, failed (mapped in UI from existing statuses).

## Tests

```bash
npm run test:phase21-7-campaign-creative
```

## Limitations

- No new publishing, campaign, approval, or analytics engines.
- Unsupported media is not falsely published.
- TikTok/LinkedIn brief platforms are not wired to Meta publishing in this integration.
- **Production deployment is NOT included** — Phase 21.7 is the final feature phase; next step is Production Readiness & Launch.
