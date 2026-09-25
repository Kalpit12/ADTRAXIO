# Production launch blockers

## Open

### 1. Vercel production deployment not validated

| | |
|--|--|
| **Severity** | CRITICAL |
| **Evidence** | No `.vercel/project.json` in repo; `PRODUCTION_BASE_URL` smoke not run against live deployment. |
| **Action** | Follow `docs/phase-20-production-launch.md` step 1 (`npm run vercel:link`), then env vars, `npm run vercel:deploy:prod`, and production smoke. |

### 2. Meta production OAuth redirects

| | |
|--|--|
| **Severity** | HIGH |
| **Evidence** | `META_REDIRECT_URI` / `NEXT_PUBLIC_APP_URL` use localhost in dev; checklist INVALID until production HTTPS URLs. |
| **Action** | Register `https://<domain>/api/social/meta/callback` in Meta app; mirror on Vercel. Run connect flow once on production. |

### 3. Stripe production webhook

| | |
|--|--|
| **Severity** | HIGH |
| **Evidence** | Webhook secret configured for local `stripe listen`; production endpoint not verified. |
| **Action** | Add `https://<domain>/api/billing/webhook` in Stripe; set `STRIPE_WEBHOOK_SECRET` on Vercel; test checkout → entitlement. |

### 4. Browser QA on production

| | |
|--|--|
| **Severity** | MEDIUM |
| **Evidence** | No signed-off responsive QA on deployed URL. |
| **Action** | Complete checklist in `production-launch-checklist.md` (viewports + pages). |

### 5. Supabase leaked-password protection

| | |
|--|--|
| **Severity** | MEDIUM |
| **Evidence** | Supabase security advisor WARN. |
| **Action** | Enable in Supabase Dashboard → Authentication → Password security. |

## Resolved

### Direct allocation RPC from client JWT

| | |
|--|--|
| **Severity** | CRITICAL (was) |
| **Evidence** | Migration 039; advisor no longer flags `apply_experiment_allocation_change` for anon/authenticated. |
| **Status** | **Resolved** |
