# Production readiness & launch audit

**Audit date:** Repository static review + local automated tests (no production deploy performed).  
**Feature scope:** Complete through Phase 21.7 — no Phase 22.

Related: [production-deployment-runbook.md](./production-deployment-runbook.md), [production-environment-matrix.md](./production-environment-matrix.md), [production-readiness-media-staging-security.md](./production-readiness-media-staging-security.md), [production-smoke-test.md](./production-smoke-test.md), [production-runbook.md](./production-runbook.md), [production-launch-checklist.md](./production-launch-checklist.md).

---

## Summary status

| Area | Status |
|------|--------|
| Repository build & Phase 21 tests | **PASS** (local evidence) |
| Media staging invariant (code) | **PASS** |
| Migrations 001–042 in repo | **READY** |
| Supabase production project | **ACTIVE** — migrations 001–042 applied (2026-09-27) |
| Vercel production deploy & domain | **DEPLOYED** — `https://adtraxio.vercel.app` (2026-09-27) |
| Stripe live mode | **NEEDS CONFIGURATION** |
| Meta app / OAuth / publishing | **NEEDS MANUAL VERIFICATION** |
| AI provider quotas & keys (prod) | **NEEDS CONFIGURATION** |
| Live smoke / negative tests | **NEEDS MANUAL VERIFICATION** |

**Launch verdict:** **NO-GO** until external configuration and live smoke tests complete. Codebase is **launch-candidate** from a build/test perspective, not “production ready” end-to-end.

---

## Production deployment session (2026-09-27)

Deployment/configuration was attempted from the engineering environment. **No product code changes.** Feature scope remains frozen at Phase 21.7.

| Step | Status | Evidence / notes |
|------|--------|------------------|
| 1. Repo regression | **PASS** | `typecheck`, `build`, invariants 9/9, static smoke 42 (0 hard fails) |
| 2. Supabase production | **PASS** (schema) | Project **Adly** `nekcjoljqchfduosmsvi` **ACTIVE_HEALTHY**. DB reachable via MCP SQL. Applied through **042_media_editor**; **040–042** applied this session. Storage: `generated-media` private, `content-media` public. Auth Site URL / prod redirects still **after Vercel**. |
| 3. Vercel deploy | **NEEDS MANUAL VERIFICATION** | Vercel MCP requires auth; CLI `whoami` timed out. Project name in OIDC metadata: `adtraxio` (development env). **Action:** `vercel login`, link prod project, set production env vars, deploy. |
| 4. Domain / HTTPS | **NEEDS MANUAL VERIFICATION** | `NEXT_PUBLIC_APP_URL` in local env is `http://localhost:3000` only. No `PRODUCTION_BASE_URL` for live smoke. |
| 5. Cron live test | **NEEDS MANUAL VERIFICATION** | Requires deployed URL + `CRON_SECRET` on Vercel. |
| 6. Stripe live | **NEEDS MANUAL VERIFICATION** | Local env has keys configured (not validated here). Controlled checkout not run. |
| 7. Meta live image publish | **NEEDS MANUAL VERIFICATION** | Not executed in this session. |
| 8. AI provider prod smoke | **NEEDS MANUAL VERIFICATION** | Not executed (avoid paid calls without explicit prod sign-off). |
| 9. Media security spot-check (live) | **NEEDS MANUAL VERIFICATION** | Requires active Supabase + deployed app. |
| 10. Full manual smoke doc | **NEEDS MANUAL VERIFICATION** | [production-smoke-test.md](./production-smoke-test.md) not executed end-to-end. |
| 11. Device QA | **NEEDS MANUAL VERIFICATION** | Not performed. |

### Observability (where to look in production)

| Event | Location |
|-------|----------|
| App / API errors | Vercel → Project → Logs / Observability |
| Cron publish/analytics | Vercel Cron invocations + `logOperation` categories `cron.publish`, `cron.analytics` |
| Failed scheduled posts | Supabase `scheduled_posts` (`status`, `error_code`, `error_message`) |
| Failed AI media jobs | Supabase `ai_media_generation_jobs` |
| Stripe webhooks | Stripe Dashboard → Webhooks + Supabase `billing_events` / `subscriptions` |
| OAuth / Meta | App routes `/api/social/meta/*`; encrypted tokens in `social_accounts` |

See also [production-runbook.md](./production-runbook.md).

**Deployment session final status:** **BLOCKED — NOT READY** (no verified Vercel production URL / live smoke).

---

## Supabase production verification (2026-09-27, post-restore)

| Check | Result |
|-------|--------|
| Project status | **ACTIVE_HEALTHY** (`nekcjoljqchfduosmsvi`) |
| API URL | `https://nekcjoljqchfduosmsvi.supabase.co` |
| Migrations before session | 001–039 (+ remote-only `harden_auth_trigger_function`) |
| **Newly applied** | `040_ai_media_infrastructure`, `041_content_studio_visual`, `042_media_editor` |
| Core tables | Present (`organizations`, `content`, `campaigns`, `social_accounts`, `scheduled_posts`, `client_workspaces`, approvals, `reports`, `analytics_daily`, AI media tables) |
| RLS on sensitive tables | **Enabled** (including `ai_media_*`) |
| `generated-media` | **private**; storage policies **authenticated** only (no `public` read on bucket) |
| `content-media` | **public**; `Public read content media` policy present |
| Auth dashboard config | **Not changed** — set Site URL + redirect URLs after production domain on Vercel |
| Auth advisors | Leaked-password protection disabled (optional hardening) |

**Primary blocker removed:** Supabase pause. **Remaining:** Supabase Auth URL alignment, Meta/Stripe prod callbacks, full manual smoke, launch sign-off.

---

## Vercel production deployment (2026-09-27)

| Item | Result |
|------|--------|
| Vercel account (CLI) | `kalpitpatel12-1338` |
| Team / scope | `nexora-digital12` |
| Project | `adtraxio` |
| Production URL | `https://adtraxio.vercel.app` |
| Deployment ID | `dpl_CF3GCsXThYmYEDeE4dCAvB55khKg` |
| Build | **PASS** (Next.js 16.3.5 on Vercel) |
| Production env vars | Configured on Vercel (16 vars; `NEXT_PUBLIC_APP_URL` = production HTTPS) |
| Basic GET `/`, `/login`, `/signup` | **200**, HTTPS, `X-Frame-Options: SAMEORIGIN` |
| Cron unauthenticated | **401** on `/api/cron/publish` |
| Cron authorized (local `CRON_SECRET` + prod URL) | **200** on optimization-readiness |
| `generated-media` unsigned public URL | **400** (bucket private) |
| Automated smoke (`PRODUCTION_BASE_URL`) | 68 checks; live homepage/session/dashboard **PASS**; several flows **BLOCKED** (test user permissions); local-only **INVALID** for Meta URL check (local `.env` still localhost — Vercel prod URL is correct) |
| Supabase Auth Site URL / redirects | **PENDING** — set in Dashboard to `https://adtraxio.vercel.app` + `/auth/callback` |
| Stripe mode on Vercel | **Test** (`sk_test_*` keys); production webhook URL must be registered for deployed host |
| Meta OAuth | **PENDING** — add `https://adtraxio.vercel.app/api/social/meta/callback` in Meta app |
| Google/Veo, ElevenLabs on Vercel | **Not configured** (optional features) |
| Manual [production-smoke-test.md](./production-smoke-test.md) | **NOT COMPLETE** |
| Controlled Stripe / Meta / AI E2E | **NOT COMPLETE** |

**Launch verdict unchanged:** **BLOCKED — NOT READY** until Supabase Auth URLs, provider callbacks, and critical manual smoke/security checks pass.

---

## Production integration verification (2026-09-27)

| Area | Result |
|------|--------|
| **Smoke fixture** | Fixed cookie handling in `phase19-production-smoke.mjs`; re-seeded Phase 16 test users |
| **Automated smoke** | `PRODUCTION_BASE_URL=https://adtraxio.vercel.app` → **0 hard failures**; content/social/campaigns/analytics **200** with fixture |
| **Integration script** | `npm run test:production-integration` — cron, stripe signature, media unsigned URL, schedule 400, cross-workspace **PASS**; OpenAI POST **403** (entitlement/limit — configuration) |
| **Supabase Auth URLs** | **NEEDS MANUAL** — Dashboard Site URL + `https://adtraxio.vercel.app/auth/callback` (no Management API token in environment) |
| **Email login (prod API)** | **PASS** via smoke (`agency-owner@adly.test`) |
| **Meta OAuth E2E** | **NOT RUN** — confirm Meta app redirect matches Vercel `META_REDIRECT_URI` |
| **Stripe checkout E2E** | **NOT RUN** — test mode; webhook signature rejection **PASS** on prod URL |
| **Signed generated-media URL** | **NOT RUN** — needs generated asset fixture on production |
| **Prepare → no content-media** | **NOT RUN** — needs creative campaign fixture |

**Next:** Supabase Dashboard auth URLs, manual smoke doc, Stripe test checkout + webhook event, Meta OAuth + image publish, optional billing entitlement for test org AI generation.

**Next:** Complete runbook §3 (Auth), §9–13 (integrations + manual QA), then launch sign-off.

---

## Final launch verification (2026-09-27)

| Area | Result |
|------|--------|
| **Free plan AI** | **Available** (5/month); test org **403** was **quota exhausted** (5/5), not missing feature |
| **Fixture fix** | `seed-phase16-test-users.mjs` resets test-org monthly AI usage counter only |
| **Auth signup/login/logout** | **PASS** on production Supabase (API) |
| **Auth Site URL / callback** | **NEEDS MANUAL CONFIGURATION** (Dashboard) |
| **OpenAI** | **PASS** — `POST /api/ai/generate-content` → structured creative on `https://adtraxio.vercel.app` |
| **Signed generated-media URL** | **PASS** — image job + `/api/ai/media/assets/{id}/url` → 200 |
| **Security matrix (automated)** | Unsigned media **400**, invalid asset **404**, schedule without contentId **400**, cron **401**, Stripe bad sig **400** |
| **Prepare / approval / staging E2E** | **NOT RUN** (needs campaign + approval + social fixtures) |
| **Stripe checkout** | **NEEDS MANUAL CONFIGURATION** |
| **Meta OAuth / publish** | **NEEDS MANUAL CONFIGURATION** |
| **Manual smoke doc + device QA** | **NOT RUN** |

Script: `npm run test:final-launch-verify` (requires `PRODUCTION_BASE_URL`).

**Launch verdict:** **BLOCKED — NOT READY** until Dashboard auth URLs, Stripe test checkout/webhook, Meta OAuth/publish, full manual E2E, and device QA complete.

---

## Final launch sign-off (2026-09-27)

### Media security E2E on production (`npm run test:media-security-e2e`)

| Step | State | Notes |
|------|--------|--------|
| A. Generate AI image on prod | **PASS** | `generated-media` |
| B. Creative Prepare → no `content-media` | **PASS** | org folder count unchanged (0→0) |
| C. Content ↔ `mediaAssetId` linkage | **PASS** | `campaign-prepare` |
| D. Unapproved / pending schedule | **BLOCKED** | No connected social account; schedule fails at `account_not_found` before approval gate is observable on HTTP path |
| E. Rejected schedule | **BLOCKED** | Same fixture gap |
| F. Changes-requested schedule | **BLOCKED** | Same fixture gap |
| G. Approve content API | **PASS** | `POST .../approval/approve` → 200 |
| G. Authorized staging → `content-media` | **BLOCKED** | Requires Meta-connected test social account on production |

**Critical invariant (Prepare does not stage):** **PASS** on live production.

**Full chain (approve → schedule → staging → publish):** **NOT RUN** on production — blocked on Meta social fixture. Static/code evidence: Phase 21.7 tests + production invariants 9/9.

### Sign-off checklist (explicit states)

| Item | State |
|------|--------|
| Supabase Auth Site URL / callback | **NEEDS MANUAL CONFIGURATION** |
| Stripe test checkout + webhook delivery | **NEEDS MANUAL CONFIGURATION** |
| Meta OAuth + image publish | **NEEDS MANUAL CONFIGURATION** |
| Manual `production-smoke-test.md` | **NOT RUN** |
| Device QA (desktop/mobile) | **NOT RUN** |
| Automated regression (typecheck/build/invariants/smoke/integration/final-launch-verify) | **PASS** |

**FINAL STATUS:** **BLOCKED — NOT READY**

---

## Production configuration preflight (2026-09-27)

Repository-only preparation for deploy after Supabase restore. **No product changes.** No deploy performed.

| Deliverable | Location |
|-------------|----------|
| Deployment runbook (manual steps 0–16) | [production-deployment-runbook.md](./production-deployment-runbook.md) |
| Environment variable matrix + audit table | [production-environment-matrix.md](./production-environment-matrix.md) |
| Config shape script | `npm run test:production-config` → `scripts/production-config-check.mjs` |

| Check | Result |
|-------|--------|
| Unsafe production `getAppUrl` localhost fallback | **FIXED** — `src/lib/env/app-url.ts`; Vercel Production requires `NEXT_PUBLIC_APP_URL` (HTTPS) |
| Meta OAuth localhost | **OK** — `social/config.ts` localhost callback only when `NODE_ENV !== "production"` |
| Code blocker | **None identified** |
| **Primary blocker** | **Supabase project `nekcjoljqchfduosmsvi` INACTIVE** |

**Exact next manual action:**

1. ~~Restore Supabase~~ **Done**
2. ~~Migrations 001–042~~ **Done** (040–042 applied 2026-09-27)
3. ~~Vercel production deployment~~ **Done** — finish Auth URLs, manual smoke, Stripe/Meta/AI verification ([runbook](./production-deployment-runbook.md) §3, §9–16)

**Not production ready** until live smoke and external verification complete.

---

## 1. Media staging invariant

**Status: PASS** (code + static tests)

Production rule: every `content-media` object is **intentionally public**. AI copies only after:

`AUTHORIZATION → APPROVAL → MEDIA TYPE → ASSET LINKAGE → PUBLIC STAGING → PUBLISH`

| Check | Evidence |
|-------|----------|
| `mediaAssetId` without `contentId` → 400 | `src/lib/publishing/service.ts` |
| Prepare does not stage | `creative-campaign-service.ts` uses `assess` only |
| Single AI writer | `stage-ai-asset.ts` ← `createScheduledPostRecord` only |
| `generated-media` private | Migration `040` (`public = false`) |
| `content-media` public read | Migration `005` (required for Meta fetch) |

**Verify in prod:** [production-readiness-media-staging-security.md](./production-readiness-media-staging-security.md) spot-checks.

---

## 2. Environment variables

**Status: NEEDS CONFIGURATION** (production values not verified here)

Compared `.env.example` to `src/` usage.

| Variable | Required for | Client-safe? | Notes |
|----------|--------------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | App, auth | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App, auth | Yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron, media staging, webhooks, jobs | **Never client** | Server/cron only |
| `OPENAI_API_KEY` | Content, images, assistant | Server only | |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` | Video (Veo) | Server only | Optional in `.env.example` |
| `ELEVENLABS_API_KEY` | Speech/sound | Server only | Optional in `.env.example` |
| `STRIPE_SECRET_KEY` | Billing | Server only | Use live key in prod manually |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | Server only | Per-environment endpoint |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_AGENCY` | Checkout | Server only | KES prices in Stripe Dashboard |
| `META_APP_ID` / `META_APP_SECRET` | Facebook OAuth | Server only | |
| `META_*` / `INSTAGRAM_*` redirect & IG app IDs | OAuth | Mixed | `NEXT_PUBLIC_APP_URL` for callbacks |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Token storage | Server only | `openssl rand -base64 32` |
| `CRON_SECRET` | All `/api/cron/*` | Server only | Vercel Cron must send `Authorization: Bearer` |
| `NEXT_PUBLIC_APP_URL` | Stripe/Meta redirects | Yes | Must match production domain HTTPS |

**Gaps in `.env.example`:** Document `GOOGLE_*` / `ELEVENLABS_*` as required if video/audio generation is offered in prod (commented today).

**Local dev defaults:** `src/lib/env/app-url.ts` (used by Stripe/invites) allows `localhost:3000` only outside Vercel Production; `social/config.ts` allows localhost Meta callback only when `NODE_ENV !== "production"`. Production must set `NEXT_PUBLIC_APP_URL` (HTTPS).

No `NEXT_PUBLIC_*` service-role or Stripe secret found in `src/`.

---

## 3. Supabase

| Item | Status |
|------|--------|
| Migrations 001–042 ordered in repo | **READY** |
| Applied to production DB | **PASS** (through 042, verified via MCP `list_migrations`) |
| RLS on tenant tables | **READY** (migrations 010–022, 040–042) |
| `generated-media` private | **READY** (migration 040) |
| `content-media` public | **READY** (migration 005, by design) |
| Auth redirect URLs | **NEEDS MANUAL VERIFICATION** |
| Backups / PITR | **NEEDS MANUAL VERIFICATION** |

### Blocker template (if migrations not applied)

| Issue | System | Action | Verify | Severity |
|-------|--------|--------|--------|----------|
| Migrations missing on prod | Supabase | `supabase db push` or run SQL through 042 | `\dt` + bucket policies match 040/005 | **Critical** |

---

## 4. Security (code review)

| Control | Status |
|---------|--------|
| Session middleware on app routes | **READY** |
| `requireOperationalScopedAuth` on sensitive APIs | **READY** |
| Workspace-scoped queries | **READY** |
| AI asset signed URLs gated | **READY** |
| Stripe webhook `constructEvent` | **READY** |
| Cron `CRON_SECRET` (503 if unset, 401 if wrong) | **READY** |
| File upload validation (`publishing/media`) | **READY** |
| Cross-workspace (unit/static) | **PASS** in Phase 21 tests |

**NEEDS MANUAL VERIFICATION:** Live IDOR attempts, RLS on production data, rate limits at edge.

---

## 5. Stripe

| Item | Status |
|------|--------|
| Checkout / Portal code | **READY** |
| Webhook signature + idempotency (`billing_events`) | **READY** |
| Entitlement checks | **READY** |
| Live keys & live webhook URL | **NEEDS CONFIGURATION** |
| Products/prices in live mode | **NEEDS CONFIGURATION** |

Do **not** switch to live keys in this audit.

---

## 6. Meta publishing

| Item | Status |
|------|--------|
| OAuth connect/callback routes | **READY** (code) |
| Token encryption | **READY** (requires `SOCIAL_TOKEN_ENCRYPTION_KEY`) |
| **Image** publish Facebook/Instagram | **READY** (code) |
| **Video** publish | **NOT SUPPORTED** (`capabilities.ts` — do not claim otherwise) |
| Production app review / permissions | **NEEDS MANUAL VERIFICATION** |
| Production redirect URIs | **NEEDS MANUAL VERIFICATION** |

---

## 7. AI providers

| Provider | Server-side only | Status |
|----------|------------------|--------|
| OpenAI | Yes | **NEEDS CONFIGURATION** (prod key, limits) |
| Google/Veo | Yes | **NEEDS CONFIGURATION** |
| ElevenLabs | Yes | **NEEDS CONFIGURATION** |
| Usage events (`ai_media_usage_events`) | Yes | **READY** |
| Tests | Mocked | **PASS** (no live paid calls in CI) |

---

## 8. Vercel / cron

| Item | Status |
|------|--------|
| `npm run build` | **PASS** (local) |
| `vercel.json` crons (8 jobs) | **READY** |
| Cron auth pattern | **PASS** (`test:production-smoke`) |
| Prod env vars on Vercel | **NEEDS MANUAL VERIFICATION** |
| `CRON_SECRET` in Vercel + Cron headers | **NEEDS CONFIGURATION** |

Cron paths: publish, analytics, growth-briefs (×2), learning-outcomes, strategy-evaluations, experiments, experiment-intelligence, optimization-readiness.

---

## 9. Observability & recovery

| Item | Status |
|------|--------|
| `logOperation` on cron publish/analytics | **READY** |
| Failed publish rows (`scheduled_posts.status=failed`) | **READY** |
| Failed media jobs (`ai_media_generation_jobs`) | **READY** |
| Stripe webhook failures | Returns 400; check logs |
| Centralized APM | **NEEDS MANUAL VERIFICATION** (not bundled) |

See [production-runbook.md](./production-runbook.md) for retries and incident basics.

---

## 10. Production configuration checklist

### SUPABASE
- [ ] Project created / unpaused
- [ ] Migrations 001–042 applied
- [ ] RLS enabled on sensitive tables
- [ ] Buckets: `generated-media` private, `content-media` public
- [ ] Auth site URL + redirect URLs = production domain

### VERCEL
- [ ] Project linked to repo
- [ ] Production domain + HTTPS
- [ ] All env vars (no secrets in `NEXT_PUBLIC_*` except Supabase anon)
- [ ] Build succeeds on deploy
- [ ] Cron + `CRON_SECRET`

### STRIPE
- [ ] Live secret key (when ready)
- [ ] Live webhook endpoint
- [ ] Pro/Agency price IDs (KES)
- [ ] Customer portal enabled

### META
- [ ] Production app
- [ ] OAuth redirect URIs
- [ ] Page + Instagram Business connection tested
- [ ] Publishing permissions for image posts

### AI
- [ ] OpenAI production key & budget alerts
- [ ] Google/Veo if video enabled
- [ ] ElevenLabs if voice/sound enabled

### SECURITY
- [ ] Media staging spot-checks
- [ ] Webhook signatures
- [ ] Cron not publicly triggerable
- [ ] `SOCIAL_TOKEN_ENCRYPTION_KEY` rotated for prod

### QA
- [ ] [production-smoke-test.md](./production-smoke-test.md)
- [ ] Negative security table
- [ ] Mobile widths

---

## Automated test evidence (this audit)

| Suite | Result |
|-------|--------|
| test:phase21-1-media | 26/26 |
| test:phase21-2-image | 17/17 |
| test:phase21-3-video | 20/20 |
| test:phase21-4-audio | 23/23 |
| test:phase21-5-creative | 18/18 |
| test:phase21-6-editor | 35/35 |
| test:phase21-7-campaign-creative | 30/30 |
| typecheck | PASS |
| build | PASS |
| test:production-smoke | 42 checks, 0 hard failures (no `PRODUCTION_BASE_URL`) |
| test:production-readiness-invariants | 9/9 PASS |
| test:production-config | 15 pass, 3 warnings (local), 0 invalid |

---

## Fixes made in this audit

- Added `docs/production-readiness-launch.md` (this document)
- Added `docs/production-smoke-test.md`
- Added `scripts/production-readiness-invariants.mjs` + npm script
- Updated `.env.example` migration range (001–042)
- **Preflight:** `docs/production-deployment-runbook.md`, `docs/production-environment-matrix.md`, `scripts/production-config-check.mjs`, `src/lib/env/app-url.ts` (production URL guard)

No product features. No RLS weakening. No deploy.
