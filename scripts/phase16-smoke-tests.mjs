/**
 * Phase 16 remediation smoke tests (no secrets printed).
 *
 * Usage: node scripts/phase16-smoke-tests.mjs
 * Optional: BASE_URL=http://localhost:3000
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function getStatus(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, init);
  return { status: res.status, body: await res.text().catch(() => "") };
}

console.log(`\nPhase 16 smoke tests → ${BASE}\n`);

const protectedApis = [
  "/api/reports",
  "/api/campaigns",
  "/api/content",
  "/api/analytics/overview",
  "/api/intelligence/overview",
  "/api/notifications",
  "/api/publishing/posts",
  "/api/social/accounts",
  "/api/clients",
  "/api/billing/subscription",
];

for (const path of protectedApis) {
  const { status } = await getStatus(path);
  record(`Unauth ${path}`, status === 401, `HTTP ${status}`);
}

const cronNoSecret = await getStatus("/api/cron/publish");
record(
  "Cron without auth header",
  process.env.CRON_SECRET
    ? cronNoSecret.status === 401
    : cronNoSecret.status === 503,
  `HTTP ${cronNoSecret.status}`
);

if (process.env.CRON_SECRET) {
  const cronBad = await getStatus("/api/cron/publish", {
    headers: { Authorization: "Bearer wrong-secret-value" },
  });
  record(
    "Cron with invalid secret",
    cronBad.status === 401,
    `HTTP ${cronBad.status}`
  );

  const cronGood = await getStatus("/api/cron/publish", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  record(
    "Cron with valid secret",
    cronGood.status === 200 || cronGood.status === 503,
    `HTTP ${cronGood.status} (503 ok if service role missing)`
  );
} else {
  record("Cron invalid secret test", false, "BLOCKED — CRON_SECRET not set");
  record("Cron valid secret test", false, "BLOCKED — CRON_SECRET not set");
}

record(
  "OPENAI_API_KEY configured",
  Boolean(process.env.OPENAI_API_KEY?.trim()),
  process.env.OPENAI_API_KEY ? "present" : "missing"
);

record(
  "SUPABASE_SERVICE_ROLE_KEY configured",
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing"
);

record(
  "STRIPE_SECRET_KEY configured",
  Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
  process.env.STRIPE_SECRET_KEY ? "present" : "missing"
);

const fbRedirect = process.env.META_REDIRECT_URI?.trim();
const igRedirect = process.env.INSTAGRAM_REDIRECT_URI?.trim();
record(
  "Meta Facebook redirect",
  fbRedirect?.includes("/api/social/meta/callback") ?? false,
  fbRedirect ? "configured" : "missing"
);
record(
  "Instagram redirect not stale tunnel",
  !igRedirect || !igRedirect.includes("trycloudflare.com"),
  igRedirect ? "configured" : "unset (OK for local FB-only dev)"
);

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (anonKey && supabaseUrl) {
  const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/user_can_access_client_workspace`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_client_workspace_id: "00000000-0000-0000-0000-000000000000",
      p_user_id: "00000000-0000-0000-0000-000000000000",
    }),
  });
  record(
    "Workspace RPC not callable by anon",
    rpc.status === 401 || rpc.status === 403 || rpc.status === 404,
    `HTTP ${rpc.status}`
  );
} else {
  record("Workspace RPC anon test", false, "BLOCKED — Supabase env missing");
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed > 0 ? 1 : 0);
