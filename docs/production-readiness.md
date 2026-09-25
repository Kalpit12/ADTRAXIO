# ADTRAXIO Production Readiness Audit (Phase 19)

Audit date: 2026-09-22. Scope: Phases 1–18.1 complete codebase. No new product features in this phase.

Severity legend: **CRITICAL** | **HIGH** | **MEDIUM** | **LOW** | **INFORMATIONAL**

---

## Authentication & onboarding

| Finding | Severity | Notes |
|--------|----------|--------|
| Supabase Auth for login/signup/callback | INFORMATIONAL | Implemented; session via SSR cookies. |
| Leaked-password protection disabled (Supabase advisor) | MEDIUM | Enable in Supabase Auth settings for production. |
| Onboarding flow (`/onboarding`) | INFORMATIONAL | Present; validate end-to-end on production URL after deploy. |

## Dashboard & Content Studio

| Finding | Severity | Notes |
|--------|----------|--------|
| Dashboard launcher routes | INFORMATIONAL | `/dashboard`, `/create`, content APIs scoped. |
| Content Studio CRUD + workspace RLS | INFORMATIONAL | Migration 022 workspace policies; server uses `requireOperationalScopedAuth`. |
| Archived content excluded from list | LOW | Verify UX when all content archived. |

## Social connections & publishing

| Finding | Severity | Notes |
|--------|----------|--------|
| Meta OAuth + encrypted tokens | HIGH | Requires production HTTPS redirect URLs registered in Meta; local uses `localhost` only. |
| Instagram Business Login | HIGH | `INSTAGRAM_REDIRECT_URI` / tunnel required for full IG flow in dev. |
| Publishing cron (`/api/cron/publish`) | INFORMATIONAL | CRON_SECRET gated; depends on connected accounts. |
| Scheduling API | INFORMATIONAL | User-initiated; not autonomous. |

## Analytics & campaigns

| Finding | Severity | Notes |
|--------|----------|--------|
| Analytics sync cron | INFORMATIONAL | Provider-dependent; may return empty without Meta insights. |
| Campaign limits + entitlements | INFORMATIONAL | `checkLimit` on create; verify Stripe plan in production. |

## Growth Intelligence & reporting

| Finding | Severity | Notes |
|--------|----------|--------|
| Intelligence recommendations | INFORMATIONAL | OpenAI optional; deterministic fallbacks exist. |
| Client reporting snapshots | INFORMATIONAL | AI narrative optional; verify PDF/view on production data volume. |

## Billing

| Finding | Severity | Notes |
|--------|----------|--------|
| Stripe checkout + portal | INFORMATIONAL | Test keys in local `.env`; production needs live keys + webhook endpoint on Vercel. |
| Webhook signature verification | INFORMATIONAL | `constructEvent` enforced; idempotent `billing_events`. |
| Entitlement gates on AI | INFORMATIONAL | `assertExperimentAiEntitlement`, usage events recorded. |

## Workspaces & collaboration

| Finding | Severity | Notes |
|--------|----------|--------|
| Agency client workspaces + switch API | INFORMATIONAL | Cookie-scoped; APIs use `applyClientWorkspaceScope` or explicit filters. |
| Collaboration / approvals | INFORMATIONAL | Role-based; viewer cannot approve optimizations. |

## AI assistant & Brand Brain

| Finding | Severity | Notes |
|--------|----------|--------|
| Assistant tools + confirmations | INFORMATIONAL | High-risk actions require pending confirmation. |
| Brand Brain scoped to workspace | INFORMATIONAL | Loaded server-side for prompts. |
| Prompt injection | MEDIUM | System prompts instruct scope; no substitute for production monitoring. |

## Growth Briefs, strategy, learning, experiments

| Finding | Severity | Notes |
|--------|----------|--------|
| Growth Brief cron | INFORMATIONAL | Weekly/daily via CRON_SECRET. |
| Strategic plans (propose only) | INFORMATIONAL | No auto-execution from strategist JSON. |
| Learning outcomes measure cron | INFORMATIONAL | Idempotency keys per variant. |
| Experiment lifecycle | INFORMATIONAL | Explicit start/measure; no auto-start from AI. |
| Evidence graph | INFORMATIONAL | Read-only aggregation; no winner language. |

## Optimization (readiness → execution → outcome)

| Finding | Severity | Notes |
|--------|----------|--------|
| `allocation_change` only | INFORMATIONAL | Enforced in validation + executor. |
| Human approval + TTL | INFORMATIONAL | 24h expiry cron. |
| Execution lock + idempotency | INFORMATIONAL | Prevents double execute. |
| Outcome after observation window | INFORMATIONAL | No success claim at execute time. |
| RPC `apply_experiment_allocation_change` callable by clients | **CRITICAL (remediated)** | Was granted to `authenticated`; **migration 039** restricts to `service_role`; executor uses admin client after permission checks. |

## Environment (configured / missing / invalid / untested)

| Variable / integration | Status (local dev audit) |
|------------------------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | configured |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | configured |
| `SUPABASE_SERVICE_ROLE_KEY` | configured |
| `CRON_SECRET` | configured |
| `OPENAI_API_KEY` | configured |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | configured |
| `META_APP_ID` / `META_APP_SECRET` | configured |
| `META_REDIRECT_URI` | configured (localhost — **invalid for production** until updated) |
| `STRIPE_*` (test mode) | configured |
| `NEXT_PUBLIC_APP_URL` | configured (localhost — update for Vercel) |
| Vercel production env | untested (not in repo) |
| Meta production publishing | untested without production redirect |
| Stripe live webhooks | untested without deployed URL |

Never commit `.env*` files (`.gitignore` includes `.env*`).

## Database & migrations

| Check | Result |
|-------|--------|
| Local SQL migrations 001–039 | Present |
| Remote Adly project migrations through `038_ai_optimization_outcome` | Applied |
| Remote `039_restrict_allocation_rpc` | Applied (Phase 19) |
| RLS on workspace-scoped tables | Migrations 013, 022, AI tables |
| Supabase security advisor | WARN: RPC execute (addressed by 039); leaked password protection |

## Cron jobs

| Route | Auth | Executes optimization? |
|-------|------|-------------------------|
| `/api/cron/publish` | Bearer CRON_SECRET | No |
| `/api/cron/analytics` | Bearer CRON_SECRET | No |
| `/api/cron/growth-briefs` | Bearer CRON_SECRET | No |
| `/api/cron/learning-outcomes` | Bearer CRON_SECRET | No |
| `/api/cron/strategy-evaluations` | Bearer CRON_SECRET | No |
| `/api/cron/experiments` | Bearer CRON_SECRET | No |
| `/api/cron/experiment-intelligence` | Bearer CRON_SECRET | No |
| `/api/cron/optimization-readiness` | Bearer CRON_SECRET | No (expire + outcome **sync** only) |

## Observability & errors

| Item | Severity | Notes |
|------|----------|--------|
| Structured safe logging (`src/lib/observability/log.ts`) | INFORMATIONAL | Added Phase 19; redacts sensitive keys. |
| Cron + optimization execute failure logs | LOW | Partial coverage; expand incrementally from production signals. |
| User-facing errors | INFORMATIONAL | Validation errors return JSON messages; no stack traces in API responses reviewed. |

## Performance (code review)

| Area | Severity | Notes |
|------|----------|--------|
| `listOptimizationOutcomes` N+1 `getExperiment` | MEDIUM | Acceptable at low volume; paginate if history grows. |
| Optimization-readiness cron org loop | MEDIUM | `limit 50` orgs; scale for large multi-tenant. |
| Dashboard parallel fetches | LOW | Monitor TTFB on production. |
| Repeated OpenAI on measure | LOW | Gated by `interpret` flags and entitlements. |

## Data quality

| Risk | Severity | Notes |
|------|----------|--------|
| NULL vs 0 in metrics | MEDIUM | Documented in experiment validation; UI should show “unavailable”. |
| Duplicate learning/eval | LOW | Idempotency keys; cron retries should not duplicate evaluated outcomes. |
| Orphan outcomes without measure | LOW | Pending until window + cron/sync. |

## Browser QA (manual)

Agent did not run device viewports in this phase. **Required before launch:**

Breakpoints: 1440, 1280, 1024, 768, 430, 390, 375.

Pages: login, dashboard, create, analytics, campaigns, assistant, experiments, optimization (+ history).

Check: overflow, hydration, console errors, loading/empty/error states, mobile nav.

Status: **PENDING MANUAL QA**

## Regression & build

Run `npm run test:production-smoke` and full Phase 17–18 suites plus `npm run typecheck` and `npm run build` (see Phase 19 report).
