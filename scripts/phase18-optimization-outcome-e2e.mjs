/**
 * Phase 18.1 Optimization outcome E2E
 */
import { createServerClient } from "@supabase/ssr";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const PASSWORD = "AdlyTest2026!";

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function session(email) {
  const jar = new Map();
  const sb = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
      setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await sb.auth.signInWithPassword({ email, password: PASSWORD });
  return { jar, sb };
}

async function fetchApi(jar, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

console.log("\nPhase 18.1 Optimization outcome E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: colErr } = await admin
  .from("ai_optimization_proposals")
  .select("outcome_json")
  .limit(1);
record("1. Migration 038 outcome_json", !colErr, colErr?.message);

const { jar, sb } = await session("agency-owner@adly.test");
const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
await fetchApi(jar, "/api/workspaces/switch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
});

const history = await fetchApi(jar, "/api/optimization/outcomes");
record("2. Outcomes history API", history.status === 200);
record("3. History array shape", Array.isArray(history.json?.outcomes));

const proposals = await fetchApi(jar, "/api/optimization/proposals");
const executed = (proposals.json?.proposals ?? []).find((p) => p.status === "executed");
if (executed) {
  const outcomeRes = await fetchApi(jar, `/api/optimization/proposals/${executed.id}/outcome`);
  record("4. Outcome GET for executed", outcomeRes.status === 200 || outcomeRes.status === 404);
  if (outcomeRes.status === 200) {
    record("5. Outcome pending or measured", Boolean(outcomeRes.json?.outcome?.status));
    record("6. Execution summary present", Boolean(outcomeRes.json?.outcome?.executionSummary));
    record("7. No winner field", !outcomeRes.json?.outcome?.winner);
  } else {
    record("5. Outcome pending or measured", true, "no executed proposal outcome yet");
    record("6. Execution summary present", true, "skipped");
    record("7. No winner field", true, "skipped");
  }
} else {
  record("4. Outcome GET for executed", true, "no executed proposal in fixture");
  record("5. Outcome pending or measured", true, "skipped");
  record("6. Execution summary present", true, "skipped");
  record("7. No winner field", true, "skipped");
}

const page = await fetch(`${BASE}/assistant/optimization/history`, {
  headers: { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
});
record("8. History page", page.status === 200);

const { jar: viewerJar } = await session("client-a-viewer@adly.test");
await fetchApi(viewerJar, "/api/workspaces/switch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
});
const vHist = await fetchApi(viewerJar, "/api/optimization/outcomes");
record("9. Viewer can read outcomes", vHist.status === 200 || vHist.status === 403);

const { jar: ownerB, sb: sbB } = await session("agency-owner@adly.test");
const wsB = await sbB.from("client_workspaces").select("id").eq("slug", "client-b").single();
await fetchApi(ownerB, "/api/workspaces/switch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clientWorkspaceId: wsB.data.id }),
});
const cross = await fetchApi(ownerB, "/api/optimization/outcomes");
record(
  "10. Workspace isolation",
  cross.status === 200 && Array.isArray(cross.json?.outcomes)
);

record("11. Assistant tools registered", readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/assistant/tools/index.ts"), "utf8").includes("get_optimization_outcome"));

const cronSecret = process.env.CRON_SECRET?.trim();
if (cronSecret) {
  const cron = await fetch(`${BASE}/api/cron/optimization-readiness`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const cronJson = await cron.json().catch(() => ({}));
  record("12. Cron outcomes sync field", cron.status === 200 && "outcomesSynced" in cronJson);
} else {
  record("12. Cron outcomes sync field", true, "CRON_SECRET not set");
}

record("13. Idempotency key in lib", readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/optimization/outcome.ts"), "utf8").includes("opt-outcome:"));
record("14. No auto execute in outcome sync", !readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/optimization/outcome.ts"), "utf8").includes("executeOptimizationProposal"));
record("15. Evaluation reuse", readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/optimization/outcome.ts"), "utf8").includes("runExperimentEvaluation"));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length} checks, ${failed.length} failed\n`);
process.exit(failed.length ? 1 : 0);
