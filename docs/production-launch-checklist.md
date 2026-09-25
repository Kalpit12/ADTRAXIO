# Production launch checklist

Status per item: **PASS** | **FAIL** | **BLOCKED** | **NOT_CONFIGURED**

Update after each validation pass. Evidence = command, dashboard screenshot, or smoke output (no secrets).

## Environment (Vercel Production)

| Item | Status | Evidence |
|------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | NOT_CONFIGURED | Set on Vercel; local only verified |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | NOT_CONFIGURED | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | NOT_CONFIGURED | Vercel server only |
| `OPENAI_API_KEY` | NOT_CONFIGURED | Vercel |
| `STRIPE_SECRET_KEY` | NOT_CONFIGURED | Use live or test per launch plan |
| `STRIPE_WEBHOOK_SECRET` | NOT_CONFIGURED | Stripe dashboard → production URL |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_AGENCY` | NOT_CONFIGURED | Vercel |
| `META_APP_ID` / `META_APP_SECRET` | NOT_CONFIGURED | Vercel |
| `META_REDIRECT_URI` | INVALID | Must be `https://<domain>/api/social/meta/callback` (no localhost) |
| `NEXT_PUBLIC_APP_URL` | INVALID | Must match production domain |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | NOT_CONFIGURED | Same value as used to encrypt existing tokens |
| `CRON_SECRET` | NOT_CONFIGURED | Vercel + matches manual cron Authorization |

## Database

| Item | Status | Evidence |
|------|--------|----------|
| Migrations through 039 applied | PASS | Supabase migration list |
| `outcome_json` / `execution_json` columns | PASS | verify-migration-038 |
| RPC `apply_experiment_allocation_change` service_role only | PASS | Supabase advisor (allocation RPC cleared) |
| Leaked password protection | FAIL | Enable in Supabase Auth |

## Security

| Item | Status | Evidence |
|------|--------|----------|
| RLS on workspace tables | PASS | Migrations 013, 022, AI tables |
| Security headers (X-Frame-Options, etc.) | PASS | `next.config.ts` |
| HTTPS on production URL | NOT_CONFIGURED | After deploy |
| `.env` not committed | PASS | `.gitignore` |
| Viewer cannot execute optimization | PASS | Smoke security check (local API) |

## Auth

| Item | Status | Evidence |
|------|--------|----------|
| Supabase redirect URLs include production domain | NOT_CONFIGURED | Supabase dashboard |
| Login / signup on production | NOT_CONFIGURED | Browser QA |
| Session cookies secure | PASS | Code: secure in production |

## Meta

| Item | Status | Evidence |
|------|--------|----------|
| Production OAuth redirect registered | NOT_CONFIGURED | Meta developer console |
| Connect → encrypted token → accounts API | NOT_CONFIGURED | Manual test |
| Publishing test post | NOT_CONFIGURED | Requires connected account |

## Stripe

| Item | Status | Evidence |
|------|--------|----------|
| Webhook endpoint on production URL | NOT_CONFIGURED | Stripe dashboard |
| Checkout → subscription → entitlement | NOT_CONFIGURED | Manual test |
| Portal / cancellation | NOT_CONFIGURED | Manual test |

## OpenAI

| Item | Status | Evidence |
|------|--------|----------|
| API key on Vercel | NOT_CONFIGURED | |
| Assistant / generation smoke | UNTESTED | After deploy |

## Cron (Vercel)

| Item | Status | Evidence |
|------|--------|----------|
| `vercel.json` schedules (incl. optimization-readiness) | PASS | Repo |
| CRON_SECRET on Vercel | NOT_CONFIGURED | |
| Authorized cron returns 200 | NOT_CONFIGURED | Manual Bearer request |
| Unauthorized cron returns 401 | PASS | Local smoke |

## Browser QA

| Viewport / pages | Status | Evidence |
|------------------|--------|----------|
| 1440–375 breakpoints | NOT_CONFIGURED | Manual |
| Core pages (login → optimization) | NOT_CONFIGURED | Manual |

## Smoke tests

| Item | Status | Evidence |
|------|--------|----------|
| `npm run test:production-smoke` deterministic | PASS | CI/local |
| `PRODUCTION_BASE_URL=... npm run test:production-smoke` | NOT_CONFIGURED | Run after deploy |

## Monitoring

| Item | Status | Evidence |
|------|--------|----------|
| Vercel function logs | NOT_CONFIGURED | |
| Cron failure logs (publish/analytics) | PASS | Phase 20 code |

## Rollback

| Item | Status | Evidence |
|------|--------|----------|
| `docs/production-runbook.md` | PASS | |

---

**Overall production status:** **PARTIALLY VALIDATED** (code + DB ready; Vercel/Meta/Stripe/browser pending operator actions).
