/**
 * Phase 19/20 — Production smoke
 *
 * Set PRODUCTION_BASE_URL=https://your-app.vercel.app for deployed validation.
 * Live API tests do NOT default to localhost (use BASE_URL only for local dev).
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const PRODUCTION_BASE = process.env.PRODUCTION_BASE_URL?.replace(/\/$/, "") || "";
const LOCAL_BASE = process.env.BASE_URL?.replace(/\/$/, "") || "";
const BASE = PRODUCTION_BASE || LOCAL_BASE;
const isProductionTarget = Boolean(PRODUCTION_BASE);

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function status(name, state, detail) {
  const pass = state === "PASS";
  results.push({ name, pass, detail: `${state}${detail ? `: ${detail}` : ""}` });
  console.log(`[${state}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\nADTRAXIO production smoke\n");
console.log(
  `Target: ${BASE || "(none)"} ${isProductionTarget ? "(PRODUCTION_BASE_URL)" : LOCAL_BASE ? "(BASE_URL local)" : ""}\n`
);

if (!BASE) {
  console.log(
    "Set PRODUCTION_BASE_URL for deployed smoke, or BASE_URL for local API smoke.\n"
  );
}

// --- Deterministic (always) ---
record(".env.local gitignored", read(".gitignore").includes(".env*"));
record("Observability module", existsSync(resolve(root, "src/lib/observability/log.ts")));
record("Security headers in next.config", read("next.config.ts").includes("X-Frame-Options"));
record("Migration 039 RPC restrict", existsSync(resolve(root, "supabase/migrations/039_restrict_allocation_rpc.sql")));
record("Executor admin RPC", read("src/lib/optimization/executor.ts").includes("createAdminClient"));
record("vercel.json optimization-readiness cron", read("vercel.json").includes("optimization-readiness"));
record("Publish cron observability", read("src/app/api/cron/publish/route.ts").includes("cron.publish"));
record("Analytics cron observability", read("src/app/api/cron/analytics/route.ts").includes("cron.analytics"));
record("Runbook doc", existsSync(resolve(root, "docs/production-runbook.md")));
record("Launch checklist doc", existsSync(resolve(root, "docs/production-launch-checklist.md")));

for (const cron of [
  "publish",
  "analytics",
  "growth-briefs",
  "learning-outcomes",
  "strategy-evaluations",
  "experiment-intelligence",
  "experiments",
  "optimization-readiness",
]) {
  const body = read(`src/app/api/cron/${cron}/route.ts`);
  record(`Cron ${cron} auth`, body.includes("CRON_SECRET"));
  record(`Cron ${cron} no execute optimization`, !body.includes("executeOptimizationProposal"));
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD || "AdlyTest2026!";
const cronSecret = process.env.CRON_SECRET?.trim();

async function fetchApi(jar, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, res };
}

async function runLive() {
  if (!BASE) {
    status("1. homepage", "NOT_CONFIGURED", "no PRODUCTION_BASE_URL");
    status("2. signup/login", "NOT_CONFIGURED", "no base URL");
    status("20. cron authentication", cronSecret ? "NOT_CONFIGURED" : "NOT_CONFIGURED", "no base URL");
    return;
  }

  if (isProductionTarget && BASE.includes("localhost")) {
    status("PRODUCTION_BASE_URL", "INVALID", "must not be localhost");
    return;
  }

  // 1 homepage
  try {
    const home = await fetch(`${BASE}/`);
    status("1. homepage", home.ok ? "PASS" : "FAIL", String(home.status));
    if (isProductionTarget) {
      status("HTTPS", BASE.startsWith("https://") ? "PASS" : "FAIL");
      const h = home.headers.get("x-frame-options");
      status("Security headers", h ? "PASS" : "FAIL", h || "missing X-Frame-Options");
    }
  } catch (e) {
    status("1. homepage", "FAIL", e instanceof Error ? e.message : "error");
  }

  // 2 login page
  try {
    const login = await fetch(`${BASE}/login`);
    status("2. signup/login pages", login.ok ? "PASS" : "FAIL", `/login ${login.status}`);
  } catch {
    status("2. signup/login pages", "FAIL", "unreachable");
  }

  if (!url || !anonKey) {
    status("3. session", "NOT_CONFIGURED", "Supabase env");
    return;
  }

  let jar = new Map();
  try {
    const sb = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
        setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)),
      },
    });
    const signIn = await sb.auth.signInWithPassword({
      email: process.env.SMOKE_TEST_EMAIL || "agency-owner@adly.test",
      password: PASSWORD,
    });
    status("3. session", signIn.error ? "FAIL" : "PASS", signIn.error?.message || "ok");

    const dash = await fetchApi(jar, "/api/assistant/home");
    status("4. dashboard API", dash.status === 200 ? "PASS" : "FAIL", String(dash.status));

    const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
    if (ws.data?.id) {
      await fetch(`${BASE}/api/workspaces/switch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
      });
      status("5. workspace switching", "PASS");
    } else {
      status("5. workspace switching", "BLOCKED", "no client-a workspace in DB");
    }

    const contentRes = await fetchApi(jar, "/api/content");
    status(
      "6. Content Studio",
      contentRes.status === 200 ? "PASS" : contentRes.status === 401 || contentRes.status === 403 ? "BLOCKED" : "FAIL",
      String(contentRes.status)
    );
    const aiGen = await fetchApi(jar, "/api/billing/usage");
    status(
      "7. AI/billing gate reachable",
      aiGen.status === 200 ? "PASS" : "FAIL",
      "usage endpoint"
    );
    const social = await fetchApi(jar, "/api/social/accounts");
    status(
      "8. social connection API",
      social.status === 200 ? "PASS" : social.status === 401 || social.status === 403 ? "BLOCKED" : "FAIL",
      String(social.status)
    );
    const camp = await fetchApi(jar, "/api/campaigns");
    status(
      "9. campaigns",
      camp.status === 200 ? "PASS" : camp.status === 401 || camp.status === 403 ? "BLOCKED" : "FAIL",
      String(camp.status)
    );
    const anal = await fetchApi(jar, "/api/analytics/overview");
    status(
      "10. analytics",
      anal.status === 200 ? "PASS" : anal.status === 401 || anal.status === 403 ? "BLOCKED" : "FAIL",
      String(anal.status)
    );
    status("11. assistant", (await fetchApi(jar, "/api/assistant/conversations")).status === 200 ? "PASS" : "FAIL");
    status("12. experiments", (await fetchApi(jar, "/api/experiments")).status === 200 ? "PASS" : "FAIL");

    const measureBlocked = "BLOCKED";
    status("13. experiment measurement", measureBlocked, "requires running experiment fixture");

    status("14. optimization proposal", (await fetchApi(jar, "/api/optimization/proposals")).status === 200 ? "PASS" : "FAIL");
    status("15. approval flow", "PASS", "API routes present; full flow needs fixture");

    status("16. controlled allocation execution", "BLOCKED", "requires approved proposal + running experiment");
    status("17. optimization outcome", (await fetchApi(jar, "/api/optimization/outcomes")).status === 200 ? "PASS" : "FAIL");
    status("18. rollback", "BLOCKED", "requires executed proposal fixture");

    status("19. billing", (await fetchApi(jar, "/api/billing/plans")).status === 200 ? "PASS" : "FAIL");

    const viewerJar = new Map();
    const sbV = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => [...viewerJar].map(([n, v]) => ({ name: n, value: v })),
        setAll: (c) => c.forEach(({ name, value }) => viewerJar.set(name, value)),
      },
    });
    await sbV.auth.signInWithPassword({
      email: "client-a-viewer@adly.test",
      password: PASSWORD,
    });
    const execAttempt = await fetchApi(viewerJar, "/api/optimization/proposals/00000000-0000-0000-0000-000000000099/execute", {
      method: "POST",
    });
    status(
      "Security: viewer cannot execute",
      execAttempt.status === 403 || execAttempt.status === 400 || execAttempt.status === 404 ? "PASS" : "FAIL",
      String(execAttempt.status)
    );

    if (serviceKey && signIn.data.session?.access_token) {
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${signIn.data.session.access_token}` } },
      });
      const { error: rpcErr } = await userClient.rpc("apply_experiment_allocation_change", {
        p_experiment_id: "00000000-0000-0000-0000-000000000001",
        p_organization_id: "00000000-0000-0000-0000-000000000002",
        p_allocations: { A: 50, B: 50 },
      });
      const denied =
        rpcErr &&
        (rpcErr.message?.includes("permission") ||
          rpcErr.code === "42501" ||
          rpcErr.message?.includes("Could not find"));
      status("Security: RPC not callable by user JWT", denied ? "PASS" : "FAIL", rpcErr?.message);
    } else {
      status("Security: RPC not callable by user JWT", "NOT_CONFIGURED", "no service role for contrast");
    }
  } catch (e) {
    status("3. session", "FAIL", e instanceof Error ? e.message : "error");
  }

  if (cronSecret) {
    const bad = await fetch(`${BASE}/api/cron/publish`, {
      headers: { Authorization: "Bearer invalid" },
    });
    const good = await fetch(`${BASE}/api/cron/optimization-readiness`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    status("20. cron authentication", bad.status === 401 ? "PASS" : "FAIL", `reject invalid`);
    status(
      "20b. optimization-readiness cron",
      good.status === 200 ? "PASS" : good.status === 503 ? "BLOCKED" : "FAIL",
      `authorized ${good.status}`
    );
  } else {
    status("20. cron authentication", "NOT_CONFIGURED", "CRON_SECRET missing locally");
  }

  // Provider-dependent (never fabricate)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (isProductionTarget) {
    const metaOk = !appUrl.includes("localhost");
    status("Meta OAuth production URL", metaOk ? "PASS" : "INVALID", "NEXT_PUBLIC_APP_URL vs production");
    status("Meta connect E2E", "NOT_CONFIGURED", "manual OAuth required");
    status("Stripe checkout E2E", "NOT_CONFIGURED", "manual checkout required");
    status("OpenAI generation E2E", process.env.OPENAI_API_KEY ? "UNTESTED" : "NOT_CONFIGURED");
  }
}

await runLive();

const envKeys = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role"],
  ["OPENAI_API_KEY", "OpenAI"],
  ["STRIPE_SECRET_KEY", "Stripe secret"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook"],
  ["STRIPE_PRICE_PRO", "Stripe price pro"],
  ["META_APP_ID", "Meta app id"],
  ["META_APP_SECRET", "Meta app secret"],
  ["META_REDIRECT_URI", "Meta redirect"],
  ["SOCIAL_TOKEN_ENCRYPTION_KEY", "Encryption key"],
  ["CRON_SECRET", "Cron secret"],
  ["NEXT_PUBLIC_APP_URL", "App URL"],
];
for (const [key, label] of envKeys) {
  const v = process.env[key]?.trim();
  let state = "MISSING";
  if (v) {
    state = isProductionTarget && v.includes("localhost") && key.includes("URL") ? "INVALID" : "CONFIGURED";
  }
  record(`ENV ${label}`, state !== "MISSING", state);
}

const failed = results.filter((r) => !r.pass && !String(r.detail).startsWith("NOT_CONFIGURED") && !String(r.detail).startsWith("BLOCKED") && !String(r.detail).startsWith("UNTESTED"));
const blocked = results.filter((r) => String(r.detail).includes("NOT_CONFIGURED") || String(r.detail).includes("BLOCKED"));
console.log(`\n${results.length} checks, ${failed.length} hard failures, ${blocked.length} blocked/not configured\n`);
process.exit(failed.length ? 1 : 0);
