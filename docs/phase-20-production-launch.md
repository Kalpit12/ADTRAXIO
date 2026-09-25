# Phase 20 — Production launch & deployment hardening

Operator runbook for **ADTRAXIO** (`adtraxio-web`). No secrets in this file.

**Current blocker:** no Vercel project linked locally (no `.vercel/project.json`). Complete step 1 before deploy.

**Repo path today:** `D:\AUREVO\aurevo-web` (package name `adtraxio-web`). Vercel root directory = this folder (not the parent `AUREVO`).

**Vercel account:** `kalpitpatel12@yahoo.com` (CLI username `kalpitpatel12-1338`)

**Vercel team (current CLI):** `nexora-digital12` (dashboard name: NEXORA DIGITAL). If you use a different team slug in the dashboard, pass `--scope <team-slug>` when linking.

---

## 0. Prerequisites

- Node 20+ and `npm ci` in this directory
- Vercel account with access to team above
- Supabase production project with migrations **through 039**
- Stripe + Meta apps ready for production URLs (can follow after first deploy when domain is known)

Install CLI (project-local):

```powershell
cd D:\AUREVO\aurevo-web
npm install
```

---

## 1. Log in and link Vercel (do this first)

```powershell
cd D:\AUREVO\aurevo-web
npm run vercel:login
```

Use device login (opens a browser). Confirm with `npm run vercel:whoami` → expect **`kalpitpatel12-1338`**. Do not share passwords in chat or commits.

Link and create the production project:

```powershell
npm run vercel:link
```

When prompted:

| Prompt | Suggested answer |
|--------|------------------|
| Scope | `nexora-digital12` (or your team slug from `vercel teams ls`) |
| Link to existing? | **No** (first time) or **Yes** if you already created `adtraxio` in dashboard |
| Project name | `adtraxio` (or `adtraxio-web`) |
| Directory | `.` (current folder) |

Non-interactive alternative (after login), if the project already exists in the dashboard:

```powershell
npx vercel link --yes --scope nexora-digital12 --project adtraxio
```

Confirm link:

```powershell
npm run vercel:whoami
Get-Content .vercel\project.json
```

---

## 2. Production environment variables

Set on Vercel → Project → **Settings → Environment Variables** → **Production** (mirror to Preview if you use preview smoke).

Reference: `.env.example` and `docs/production-launch-checklist.md`.

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only; never `NEXT_PUBLIC_` |
| `OPENAI_API_KEY` | Server only |
| `STRIPE_SECRET_KEY` | Live or test per launch plan |
| `STRIPE_WEBHOOK_SECRET` | From Stripe endpoint for production URL |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_AGENCY` | Live price IDs |
| `META_APP_ID` / `META_APP_SECRET` | Meta app |
| `META_REDIRECT_URI` | `https://<domain>/api/social/meta/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://<domain>` (no trailing slash) |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Same as used when tokens were encrypted |
| `CRON_SECRET` | Random; used by Vercel Cron `Authorization: Bearer` |

Pull template locally (optional, creates `.env.local` — **gitignored**):

```powershell
npx vercel env pull .env.vercel.production --environment=production
```

---

## 3. Deploy to production

```powershell
npm run build
npm run vercel:deploy:prod
```

Note the production URL (e.g. `https://adtraxio.vercel.app` or custom domain).

Update `NEXT_PUBLIC_APP_URL`, `META_REDIRECT_URI`, Supabase redirect URLs, and Stripe webhook URL to match **final** HTTPS domain, then redeploy if those changed.

---

## 4. OAuth (Supabase + Meta)

**Supabase** → Authentication → URL configuration:

- Site URL: `https://<domain>`
- Redirect URLs: `https://<domain>/**` and auth callback paths you use

**Meta** → App → Facebook Login / Instagram:

- Valid OAuth redirect: `https://<domain>/api/social/meta/callback`

---

## 5. Stripe production

- Webhook: `https://<domain>/api/billing/webhook`
- Events: subscription lifecycle (as configured in app)
- Copy signing secret → `STRIPE_WEBHOOK_SECRET` on Vercel
- Test checkout → entitlement in app → portal/cancel

---

## 6. Vercel Cron

Schedules are in `vercel.json`. Ensure `CRON_SECRET` is set on Vercel.

Manual check (replace domain and secret):

```http
GET https://<domain>/api/cron/publish
Authorization: Bearer <CRON_SECRET>
```

Expect **200** with secret, **401** without.

---

## 7. Supabase production security

- Enable **leaked password protection** (Auth)
- Confirm RLS on workspace tables
- Confirm migration **039** (`apply_experiment_allocation_change` not callable by anon/authenticated)

---

## 8. Production smoke tests

```powershell
$env:PRODUCTION_BASE_URL="https://<your-production-domain>"
npm run test:production-smoke
```

Requires production env on Vercel; some checks use Supabase credentials from `.env.local` if present.

---

## 9. Manual browser QA

Use `docs/production-launch-checklist.md` (Browser QA section): login, onboarding, dashboard, assistant, content, social, publishing, analytics, campaigns, billing, agency workspaces, approvals, reporting, mobile, console errors.

---

## 10. Final readiness

- Update checklist statuses in `docs/production-launch-checklist.md`
- Close items in `docs/production-blockers.md`
- Rollback: `docs/production-runbook.md`

**Phase 21** only after production smoke + browser QA pass; scope from failures found in QA.
