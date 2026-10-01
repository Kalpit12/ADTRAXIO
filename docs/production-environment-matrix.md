# ADTRAXIO production environment matrix

**Purpose:** Map every environment variable to deployment targets. **No secret values** — use placeholders when setting up Vercel/Supabase/Stripe/Meta.

Related: [production-deployment-runbook.md](./production-deployment-runbook.md), [production-readiness-launch.md](./production-readiness-launch.md).

---

## Full variable audit

| Variable | Used by | Required production? | Client/server | Notes |
|----------|---------|----------------------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase/*`, middleware, media URLs | **Yes** | Client + server | Must match Supabase project ref |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser/server clients | **Yes** | Client + server | RLS-enforced; safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | `admin.ts`, crons, staging, webhooks | **Yes** | **Server only** | Never `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_APP_URL` | Stripe success/cancel, invites, Meta OAuth fallback | **Yes** | Client + server | HTTPS in production; no localhost |
| `CRON_SECRET` | All `/api/cron/*` | **Yes** | **Server only** | Vercel Cron `Authorization: Bearer` |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Meta token storage | **Yes** (if social) | **Server only** | 32-byte base64 |
| `STRIPE_SECRET_KEY` | Billing checkout/portal | **Yes** (if billing) | **Server only** | Live vs test by key prefix |
| `STRIPE_WEBHOOK_SECRET` | `billing/webhook.ts` | **Yes** (if billing) | **Server only** | Per webhook endpoint |
| `STRIPE_PRICE_PRO` | `billing/plans.ts` | **Yes** (if billing) | **Server only** | Live Price ID when live |
| `STRIPE_PRICE_AGENCY` | `billing/plans.ts` | **Yes** (if billing) | **Server only** | Live Price ID when live |
| `META_APP_ID` | Facebook OAuth | **Yes** (if Meta) | Server (ID can be public in Meta UI) | Not in `NEXT_PUBLIC_*` in this app |
| `META_APP_SECRET` | Facebook OAuth | **Yes** (if Meta) | **Server only** | |
| `META_REDIRECT_URI` | OAuth override | Optional | Server | Else `{NEXT_PUBLIC_APP_URL}/api/social/meta/callback` |
| `META_INSTAGRAM_APP_ID` / `INSTAGRAM_APP_ID` | Instagram Login | **Yes** (if IG) | Server | Separate from Facebook app |
| `META_INSTAGRAM_APP_SECRET` / `INSTAGRAM_APP_SECRET` | Instagram Login | **Yes** (if IG) | **Server only** | |
| `META_INSTAGRAM_REDIRECT_URI` / `INSTAGRAM_REDIRECT_URI` | Instagram OAuth | Optional | Server | HTTPS required |
| `NEXT_PUBLIC_INSTAGRAM_APP_URL` | Instagram callback base | Optional | Client | Builds HTTPS callback if set |
| `META_GRAPH_API_VERSION` | Graph API calls | Optional | Server | Default `v21.0` |
| `OPENAI_API_KEY` | Content, assistant, media copy | **Yes** (if AI copy) | **Server only** | |
| `OPENAI_MODEL` | OpenAI callers | Optional | Server | Default `gpt-4o-mini` |
| `OPENAI_IMAGE_MODEL` | Image generation | Optional | Server | Default `gpt-image-1` |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` | Veo video | **Yes** (if video) | **Server only** | Either name accepted |
| `GOOGLE_VIDEO_MODEL` | Video jobs | Optional | Server | Default `veo-2.0-generate-001` |
| `ELEVENLABS_API_KEY` | Speech/sound | **Yes** (if audio) | **Server only** | |
| `PRODUCTION_BASE_URL` | `phase19-production-smoke.mjs` | Optional | Scripts | HTTPS prod URL for live smoke |
| `BASE_URL` | E2E scripts | Local/preview | Scripts | Default `http://localhost:3000` |
| `SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD` | Live smoke login | Optional | Scripts | Not for Vercel prod |
| `EXPERIMENT_TEST_MODE` | `experiments/test-mode.ts` | **No** in prod | Server | Ignored when `VERCEL_ENV=production` |
| `PREFLIGHT_TARGET` | `production-config-check.mjs` | Optional | Scripts | Set `production` for strict check |
| `VERCEL_URL` | `app-url.ts` preview fallback | Auto (Vercel) | Server | Not used when `VERCEL_ENV=production` without `NEXT_PUBLIC_APP_URL` |

### Gaps / hygiene

| Issue | Detail |
|-------|--------|
| **Missing in local** | Production URL (`NEXT_PUBLIC_APP_URL` often localhost until domain is set) |
| **Obsolete aliases** | `INSTAGRAM_*` duplicates `META_INSTAGRAM_*` — both supported intentionally |
| **Duplicated names** | `GEMINI_API_KEY` vs `GOOGLE_GENERATIVE_AI_API_KEY` — same role |
| **Must never be `NEXT_PUBLIC_`** | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*` secrets, `OPENAI_API_KEY`, `META_APP_SECRET`, `CRON_SECRET`, provider keys |
| **Localhost defaults** | `src/lib/env/app-url.ts` → localhost only non-production; `social/config.ts` → localhost callback only `NODE_ENV !== "production"` |

---

## Environment targets

| Variable | Local | Preview | Production | Secret? | Required? | Source |
|----------|-------|---------|------------|---------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | <SET_IN_VERCEL> | <SET_IN_VERCEL> | No | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | <SET_IN_VERCEL> | <SET_IN_VERCEL> | No | Yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (scripts) | <SET_IN_VERCEL> | <SET_IN_VERCEL> | **Yes** | Yes | Supabase → service_role |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Preview URL or custom | <SET_IN_VERCEL> HTTPS | No | Yes (prod) | Your domain |
| `CRON_SECRET` | `.env.local` | <SET_IN_VERCEL> | <SET_IN_VERCEL> | **Yes** | Yes | `openssl rand -hex 32` |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | `.env.local` | <SET_IN_VERCEL> | <SET_IN_VERCEL> | **Yes** | Yes (social) | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Test key | Test or live | <SET_IN_STRIPE> live | **Yes** | Billing | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI / test | Per env endpoint | <SET_IN_STRIPE> | **Yes** | Billing | Stripe webhook |
| `STRIPE_PRICE_PRO` | Test price ID | Test | <SET_IN_STRIPE> live | No | Billing | Stripe Products |
| `STRIPE_PRICE_AGENCY` | Test price ID | Test | <SET_IN_STRIPE> live | No | Billing | Stripe Products |
| `META_APP_ID` | Dev app | Dev/staging app | <SET_IN_META> | No | Meta | Meta Developer |
| `META_APP_SECRET` | Dev | Dev | <SET_IN_META> | **Yes** | Meta | Meta Developer |
| `META_REDIRECT_URI` | Optional tunnel | Preview HTTPS URL | `{APP_URL}/api/social/meta/callback` | No | Meta | Must match Meta app settings |
| `OPENAI_API_KEY` | Dev key | <SET_IN_OPENAI> | <SET_IN_OPENAI> | **Yes** | AI features | OpenAI platform |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | <SET_IN_GOOGLE> | <SET_IN_GOOGLE> | **Yes** | Video | Google AI Studio |
| `ELEVENLABS_API_KEY` | Optional | <SET_IN_ELEVENLABS> | <SET_IN_ELEVENLABS> | **Yes** | Audio | ElevenLabs |
| `PRODUCTION_BASE_URL` | — | — | HTTPS app URL | No | Smoke only | For `npm run test:production-smoke` |

---

## URL construction reference (intentional dev URLs)

| Flow | Source | Production expectation |
|------|--------|------------------------|
| Stripe checkout/portal return | `getAppUrl()` → `src/lib/env/app-url.ts` | `NEXT_PUBLIC_APP_URL` required on Vercel Production |
| Meta Facebook OAuth callback | `META_REDIRECT_URI` or `{NEXT_PUBLIC_APP_URL}/api/social/meta/callback` | HTTPS; registered in Meta app |
| Meta Instagram callback | `INSTAGRAM_REDIRECT_URI` or `NEXT_PUBLIC_INSTAGRAM_APP_URL` or shared HTTPS Meta URI | HTTPS only |
| Supabase Google OAuth | `window.location.origin` + `/auth/callback` | Supabase Auth → redirect URLs must include prod domain |
| Client invite links | `getAppUrl()` + `/clients/invite?token=` | Same as app URL |
| Cron invocations | Vercel → `/api/cron/*` | `CRON_SECRET` in Authorization header |
| Public content media | `NEXT_PUBLIC_SUPABASE_URL` + `/storage/v1/object/public/content-media/...` | Public bucket by design |
| Generated media | Signed URLs via server | Private bucket `generated-media` |

**Intentional localhost (development only):**

- `src/lib/env/app-url.ts` → `http://localhost:3000` when not on Vercel and no `NEXT_PUBLIC_APP_URL`
- `src/lib/social/config.ts` → `http://localhost:3000/api/social/meta/callback` when `NODE_ENV !== "production"` and no explicit URI
