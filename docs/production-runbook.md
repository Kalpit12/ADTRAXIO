# ADTRAXIO production runbook

Operational reference for launch and incidents. No secrets in this document.

## Deployment

1. Merge to production branch; Vercel builds from `adtraxio-web` root (confirm `turbopack.root` / monorepo settings if build fails).
2. Required env vars on Vercel **Production** — see `docs/production-launch-checklist.md`.
3. After deploy (PowerShell example):

   `$env:PRODUCTION_BASE_URL="https://<domain>"; npm run test:production-smoke`

   Live checks use `PRODUCTION_BASE_URL` only (not localhost). For local API smoke, set `BASE_URL=http://localhost:3000` with the dev server running.
4. Run `npm run typecheck` and `npm run build` in CI or locally before promoting.

### Roll back application

- Vercel: **Deployments → previous deployment → Promote to Production**
- Does not roll back database migrations automatically.

### Roll back database

- Migrations are forward-only on Supabase. **039** (RPC restrict) must not be reverted without restoring client-callable RPC risk.
- For data fixes, use scoped SQL in Supabase SQL editor with org filters; avoid destructive deletes without backup.

## Disable features quickly

| Feature | Action |
|---------|--------|
| Optimization execution | No env kill-switch; block via removing `content.edit` for users or pausing proposals (expire cron still safe). |
| Crons | Remove/disable schedules in Vercel `vercel.json` or pause project crons. |
| AI generation | Remove `OPENAI_API_KEY` on Vercel (features degrade with deterministic fallbacks where implemented). |
| Publishing | Disable publish cron; disconnect Meta in `/social`. |
| Billing | Stripe dashboard — pause webhooks or portal only for emergencies. |

## Optimization rollback (product)

1. User opens executed proposal → **Rollback** (requires live allocation matches executed state).
2. Audit log on `ai_optimization_proposals.audit_log_json`.
3. Outcome may remain `pending` or measured — rollback does not delete outcome history.

## Provider disconnect

1. **Meta:** `/social` → disconnect account; tokens removed from encrypted storage.
2. **Stripe:** Customer portal cancellation; verify webhook updates `subscriptions` table.

## Cron schedules (Vercel Hobby)

Hobby teams only allow **once-per-day** cron expressions. `vercel.json` uses daily schedules (publish at 05:00 UTC). For **5-minute publishing**, upgrade to **Pro** and set publish back to `*/5 * * * *`, or call `/api/cron/publish` from an external scheduler with `CRON_SECRET`.

## Cron manual invoke (authorized)

```http
GET https://<domain>/api/cron/<name>
Authorization: Bearer <CRON_SECRET>
```

Routes: `publish`, `analytics`, `growth-briefs`, `learning-outcomes`, `strategy-evaluations`, `experiments`, `experiment-intelligence`, `optimization-readiness`.

`optimization-readiness`: expires stale proposals + syncs outcomes only — **never executes allocation**.

## Observability

- Structured JSON logs: `logOperation` / `logRequestFailure` in Vercel **Functions** logs.
- Filter: `operation` = `optimization.execute`, `cron.publish`, `cron.analytics`, `cron.optimization-readiness`.
- Never paste tokens into tickets.

## Incident checklist

1. Confirm deployment version (Vercel deployment ID).
2. Check Supabase status + recent migrations.
3. Check Stripe/Meta status pages.
4. Re-run production smoke against `PRODUCTION_BASE_URL`.
5. Document in post-incident notes (use `docs/production-learning-plan.md` metrics).
