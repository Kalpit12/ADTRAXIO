# Production smoke test plan

Run after deployment with `PRODUCTION_BASE_URL=https://your-domain` and configured env vars.  
Automated checks:

- `npm run test:production-smoke` — static + live API (set `PRODUCTION_BASE_URL`)
- `npm run test:production-readiness-invariants`
- `node scripts/production-integration-verify.mjs` — media/cron/stripe signature + authenticated API matrix

Record **PASS / FAIL / SKIP** per row.

### Production smoke fixture (authorized API paths)

The automated smoke uses a **dedicated test matrix** (not production customer accounts):

| Field | Value |
|-------|--------|
| **Account** | `agency-owner@adly.test` (override with `SMOKE_TEST_EMAIL`) |
| **Password** | `SMOKE_TEST_PASSWORD` or default from `seed-phase16-test-users.mjs` |
| **Organization** | `Adly Test Agency` (agency type) |
| **Role** | `owner` on org; operational APIs require **client workspace** `client-a` |
| **Seed** | `node scripts/seed-phase16-test-users.mjs` (idempotent; requires `SUPABASE_SERVICE_ROLE_KEY`) |

**Important:** After login, smoke must call `/api/workspaces/switch` and **persist** the `adly_client_workspace_id` cookie (httpOnly). Missing cookie caused prior **403**s on content/social/campaigns/analytics — not an authorization bug.

Viewer negative tests use `client-a-viewer@adly.test`.

### Billing / AI entitlement (Free plan)

Launch behavior (code): **Free** plan includes **5** `ai_generation` events per calendar month (`PLAN_ENTITLEMENTS.free.aiGenerationsPerMonth`). Hitting the limit returns **403** with `code: PLAN_LIMIT` — not an auth bug.

The Phase 16 seed script resets **only** the test org’s current-month `billing_usage_events` for `ai_generation` so smoke can run without changing entitlement logic. Re-run:

`node scripts/seed-phase16-test-users.mjs`

Automated launch verification: `PRODUCTION_BASE_URL=https://adtraxio.vercel.app npm run test:final-launch-verify`

**Critical media invariant (production):** `PRODUCTION_BASE_URL=https://adtraxio.vercel.app npm run test:media-security-e2e`

Verifies **Creative Prepare does not write to `content-media`**. Full approve→schedule→staging→publish on production requires a **connected Meta test social account** (currently **BLOCKED** on prod DB).

## Auth

| Step | Action | Expected |
|------|--------|----------|
| A1 | Sign up new user | Account created, onboarding or dashboard |
| A2 | Log out / log in | Session restored |
| A3 | Password reset email | Link works (Supabase auth URLs configured) |
| A4 | OAuth (if enabled) | Callback completes, account connected |

## Content

| Step | Action | Expected |
|------|--------|----------|
| C1 | AI copy generation | Response, no API key in browser/network |
| C2 | Save draft | Persists in `content` for workspace |

## Media (Phase 21)

| Step | Action | Expected |
|------|--------|----------|
| M1 | Generate image | Job completes, signed preview URL |
| M2 | Generate video | Job completes or clear provider error |
| M3 | Voice / sound | Job completes or clear error |
| M4 | Media editor save | New asset row, original unchanged |
| M5 | Creative Studio concept + assets | No auto-generation on load |

## Campaigns & creative integration

| Step | Action | Expected |
|------|--------|----------|
| K1 | Create campaign | Visible in workspace |
| K2 | Creative → prepare for campaign | Content + `campaign_content` link |
| K3 | Request approval | Status pending |
| K4 | Approve content | Publish allowed |
| K5 | Schedule post (image) | `scheduled_posts` scheduled; **no** public `content-media` until schedule/publish API |
| K6 | Publish now (image, approved) | Success only after API confirms; Facebook/Instagram **image** only |

## Publishing matrix (code truth)

| Platform | Image | Video |
|----------|-------|-------|
| Facebook | Supported | **Not supported** (capabilities) |
| Instagram | Supported (media required) | **Not supported** |

## Analytics & billing

| Step | Action | Expected |
|------|--------|----------|
| N1 | Analytics sync / cron | Runs with `CRON_SECRET` only |
| N2 | Campaign performance | Content linked via `campaign_content` |
| N3 | Stripe Checkout (test or live mode as intended) | Redirect, subscription row |
| N4 | Webhook test event | 200, idempotent `billing_events` |
| N5 | Billing portal | Opens Stripe portal |

## Negative security (required)

| Test | How | Expected |
|------|-----|----------|
| Unsigned `generated-media` URL | Open public URL to known private path | **403/404** |
| Cross-workspace asset URL API | Asset ID from other client | **404** |
| Cross-workspace campaign API | Campaign ID from other workspace | **404/403** |
| Publish unapproved content | Schedule with pending approval | **Blocked** |
| Publish rejected / changes requested | Same | **Blocked** |
| `mediaAssetId` without `contentId` | POST `/api/publishing/publish` | **400** |
| Unsupported video publish | Video `mediaAssetId` | **Blocked** before public staging |
| Disconnected social account | Publish | Clear error, no fake success |
| Invalid Stripe webhook signature | POST webhook | **400** |
| Unauthenticated cron | GET `/api/cron/publish` | **401/503** |
| Client `mediaUrl` for AI creative | Use `mediaAssetId` path | Server stages; ignore spoofed URL |

## Mobile / desktop

Spot-check **320, 375, 768, 1024, 1440** on: login, Content Studio, Creative Studio review, publishing dialog.
