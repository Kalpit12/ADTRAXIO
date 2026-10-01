# ADTRAXIO Production Deployment Runbook

**Feature freeze:** Phase 21.7 — deployment and configuration only.  
**Supabase (2026-09-27):** Project `nekcjoljqchfduosmsvi` is **ACTIVE**; migrations **001–042** applied (040–042 applied during post-restore verification). Proceed with Vercel steps below; do not deploy until production env vars are set.

Companion docs: [production-environment-matrix.md](./production-environment-matrix.md), [production-readiness-launch.md](./production-readiness-launch.md), [production-smoke-test.md](./production-smoke-test.md).

---

## 0. Preflight

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Confirm feature freeze (no Phase 22) | No unapproved product diffs | `git status` clean or docs/scripts only | [ ] |
| Run repository checks | All pass locally | `npm run test:production-config` | [ ] |
| Run invariants | 9/9 | `npm run test:production-readiness-invariants` | [ ] |
| Run static smoke | 0 hard failures | `npm run test:production-smoke` | [ ] |
| Typecheck + build | PASS | `npm run typecheck` && `npm run build` | [ ] |
| Strict config (optional) | No MISSING/INVALID | `PREFLIGHT_TARGET=production npm run test:production-config` (after prod env vars set in shell or Vercel pull) | [ ] |

---

## 1. Supabase Restore

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Open Supabase Dashboard → project **Adly** (`nekcjoljqchfduosmsvi`) | Status **Active** (not paused) | Dashboard project health | [x] 2026-09-27 |
| Note API URL and anon key | Match `NEXT_PUBLIC_*` in Vercel | Settings → API | [ ] |
| Confirm billing/plan allows API | Requests succeed | MCP SQL `SELECT 1` | [x] |

---

## 2. Supabase Migrations

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Link CLI to project | `supabase link --project-ref nekcjoljqchfduosmsvi` | CLI connected | [ ] optional |
| Apply migrations **001–042** | No errors | Migration history shows `042_media_editor` | [x] |
| Verify latest migration | `042_media_editor.sql` applied | `list_migrations` includes 040–042 | [x] |

**Note:** Remote history includes `harden_auth_trigger_function` (not in repo); no action required if auth works.

---

## 3. Supabase Auth

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Set **Site URL** | Production HTTPS domain | Authentication → URL configuration | [ ] `https://adtraxio.vercel.app` |
| Add **Redirect URLs** | `https://<domain>/auth/callback` (+ preview if needed) | Same panel | [ ] |
| Google OAuth (if used) | Client IDs configured in Supabase + Google Cloud | Test sign-in on prod | [ ] |
| Production smoke fixture | Phase 16 seed + workspace cookie | `node scripts/seed-phase16-test-users.mjs` then `PRODUCTION_BASE_URL=... npm run test:production-smoke` | [x] 2026-09-27 |
| Final launch verify script | Auth, OpenAI, signed media, security matrix | `PRODUCTION_BASE_URL=... npm run test:final-launch-verify` | [x] 2026-09-27 (partial; manual gaps remain) |
| Media security E2E | Prepare must not stage; approve API | `PRODUCTION_BASE_URL=... npm run test:media-security-e2e` | [x] Prepare **PASS**; schedule/staging **BLOCKED** (no Meta test account) |

---

## 4. Supabase Storage

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Bucket `generated-media` | **Private** (`public = false`) | Storage → bucket settings | [x] |
| Bucket `content-media` | **Public** read (Meta fetch) | Storage → policies match migration 005 | [x] |
| RLS on `storage.objects` | Org-scoped for generated-media | Policy review in SQL editor | [ ] |
| No anonymous read on generated-media | Direct public URL fails | Attempt unauthenticated object URL | [ ] |

---

## 5. Vercel Project

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| `vercel login` / link repo | Project linked (e.g. `adtraxio`) | `vercel whoami` → `kalpitpatel12-1338` | [x] |
| Production branch | `main` (or your release branch) | Project settings | [ ] |
| Build command | `npm run build` (default) | `package.json` | [x] |
| Node version | Compatible with Next 16 | Vercel settings / `engines` if set | [x] 24.x |

---

## 6. Vercel Environment Variables

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Copy all **Required** vars from [matrix](./production-environment-matrix.md) | Production env complete | Vercel → Settings → Environment Variables | [x] 2026-09-27 |
| `NEXT_PUBLIC_APP_URL` | HTTPS production domain | `https://adtraxio.vercel.app` | [x] |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only, not exposed | Not in client bundle grep | [ ] spot-check |
| `CRON_SECRET` | Set for Production | Matches cron route expectations | [x] |
| Pull env locally (optional) | `vercel env pull` for smoke | File not committed | [ ] |

Helper (local): `node scripts/sync-vercel-production-env.mjs` — syncs from `.env.local` with production URL overrides; never logs values.

---

## 7. Domain + HTTPS

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Add custom domain in Vercel | DNS verified | HTTPS certificate active | [ ] optional |
| Update `NEXT_PUBLIC_APP_URL` | Matches custom domain | Redeploy after change | [x] `adtraxio.vercel.app` |
| Homepage loads | 200 OK | `curl -I https://<domain>/` | [x] |

---

## 8. Cron

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Confirm `vercel.json` crons (8 jobs) | Listed in Vercel Cron UI | publish, analytics, growth-briefs ×2, learning, strategy, experiments, experiment-intelligence, optimization-readiness | [ ] |
| `CRON_SECRET` on Vercel | Cron requests authorized | Manual `curl` with `Authorization: Bearer <secret>` → not 401 | [ ] |
| Unauthenticated cron | **401** | `curl` without header | [ ] |

---

## 9. Stripe

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| **Do not switch modes in Cursor** — use Dashboard when ready | Live/test mode explicit | Dashboard mode indicator | [ ] |
| Webhook endpoint | `https://<domain>/api/billing/webhook` (verify route in repo) | Stripe → Webhooks | [ ] |
| `STRIPE_WEBHOOK_SECRET` | Matches endpoint signing secret | Test event in Dashboard | [ ] |
| Live `STRIPE_PRICE_PRO` / `STRIPE_PRICE_AGENCY` | KES prices | Checkout test (controlled) | [ ] |
| Customer portal | Enabled if using portal API | Stripe settings | [ ] |

---

## 10. Meta

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Production app ID/secret in Vercel | Connect flow starts | `/api/social/meta/connect` | [ ] |
| Redirect URI | `https://<domain>/api/social/meta/callback` | Meta app → Valid OAuth Redirect URIs | [ ] |
| Scopes | Facebook: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` | App review if needed | [ ] |
| Instagram | Separate app ID/secret if using Instagram Login | HTTPS redirect | [ ] |
| Publishing | **Image only** (no video in product) | Test scheduled image post | [ ] |

---

## 11. AI Providers

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| `OPENAI_API_KEY` | Copy/generation works | Single controlled generation | [ ] |
| Google/Veo key (if video enabled) | Job queued | `ai_media_generation_jobs` row | [ ] |
| ElevenLabs (if audio enabled) | Job completes | Usage row | [ ] |
| Budget alerts | Set in provider consoles | External dashboards | [ ] |

---

## 12. First Deployment

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Deploy production | Build success | Vercel deployment log | [x] `dpl_CF3GCsXThYmYEDeE4dCAvB55khKg` |
| No build-time env errors | `getAppUrl` not throwing | Build log clean | [x] |
| Runtime smoke | App reachable | Browser `/login` | [x] |

---

## 13. Production Smoke Test

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Set `PRODUCTION_BASE_URL=https://<domain>` | Live checks run | `npm run test:production-smoke` | [ ] |
| Follow [production-smoke-test.md](./production-smoke-test.md) | Manual steps PASS | Document checklist | [ ] |
| Media staging spot-check | No public generated-media leak | [production-readiness-media-staging-security.md](./production-readiness-media-staging-security.md) | [ ] |

---

## 14. Security Spot Checks

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Cron without secret | 401 | curl test | [ ] |
| Cross-workspace API | 403/404 | Negative tests | [ ] |
| Stripe webhook bad signature | 400 | Stripe test | [ ] |
| Service role not in client JS | Absent | View page source / network | [ ] |

---

## 15. Real Device QA

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Mobile login + dashboard | Usable layout | Phone browser | [ ] |
| OAuth on mobile | Completes | Meta/Google if enabled | [ ] |

---

## 16. Launch Sign-off

| Action | Expected result | Verification | PASS |
|--------|-----------------|--------------|------|
| Stakeholder sign-off | GO/NO-GO recorded | Meeting / ticket | [ ] |
| Update [production-readiness-launch.md](./production-readiness-launch.md) | Status reflects live verification | Doc commit | [ ] |
| Monitoring | Vercel logs + Supabase + Stripe dashboards | Runbook observability table | [ ] |

**Completed:** Supabase restore + migrations 001–042; Vercel production deploy (`https://adtraxio.vercel.app`). **Next blockers:** Supabase Auth URLs (§3), Meta redirect URI, Stripe webhook for prod URL, manual smoke §13–16.
