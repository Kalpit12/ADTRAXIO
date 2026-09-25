/**
 * Phase 17.7 — Live execution plan API flow (remote DB + dev server).
 *
 * Usage: npm run dev (separate terminal), then:
 *   node scripts/phase17-execution-api-e2e.mjs
 *
 * Optional: SKIP_EXECUTE=1 to only test create + GET persistence.
 */
import { createServerClient } from "@supabase/ssr";
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const TEST_PASSWORD = "AdlyTest2026!";
const SKIP_EXECUTE = process.env.SKIP_EXECUTE === "1";

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function createAuthedSession(email) {
  const jar = new Map();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { supabase, jar };
}

async function apiFetch(jar, path, init = {}) {
  const headers = new Headers(init.headers);
  const cookie = cookieHeader(jar);
  if (cookie) headers.set("Cookie", cookie);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* text */
  }
  return { status: res.status, json, body };
}

async function switchWorkspace(jar, clientWorkspaceId) {
  return apiFetch(jar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId }),
  });
}

console.log(`\nPhase 17.7 Execution API E2E → ${BASE}\n`);

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: tableErr } = await admin.from("ai_execution_plans").select("id").limit(1);
record(
  "Migration 028 (ai_execution_plans)",
  !tableErr,
  tableErr?.message ?? "queryable"
);

if (tableErr) {
  process.exit(1);
}

try {
  const { jar: ownerJar, supabase: ownerSb } = await createAuthedSession(
    "agency-owner@adly.test"
  );

  const { data: workspaces } = await ownerSb
    .from("client_workspaces")
    .select("id, slug")
    .order("slug");
  const clientAId = workspaces?.find((w) => w.slug === "client-a")?.id;
  if (!clientAId) {
    throw new Error("client-a workspace not found — run seed scripts.");
  }

  await switchWorkspace(ownerJar, clientAId);

  const { data: briefs } = await ownerSb
    .from("ai_growth_briefs")
    .select("id, recommendations")
    .eq("client_workspace_id", clientAId)
    .order("created_at", { ascending: false })
    .limit(5);

  let growthBriefId;
  let recommendationIndex = 0;
  for (const b of briefs ?? []) {
    const recs = b.recommendations ?? [];
    const idx = recs.findIndex((r) =>
      ["create_content", "repurpose", "campaign", "schedule"].some((t) =>
        String(r?.type ?? r?.action ?? "").includes(t)
      )
    );
    if (idx >= 0) {
      growthBriefId = b.id;
      recommendationIndex = idx;
      break;
    }
  }

  const createBody = growthBriefId
    ? {
        objective: "Phase 17.7 E2E — growth brief execution plan",
        growthBriefId,
        recommendationIndex,
      }
    : {
        objective: "Phase 17.7 E2E — objective-only execution plan",
      };

  const createRes = await apiFetch(ownerJar, "/api/execution/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });

  const planId = createRes.json?.plan?.id;
  record(
    "POST /api/execution/plan",
    (createRes.status === 200 || createRes.status === 201) && Boolean(planId),
    `HTTP ${createRes.status}${createRes.json?.error ? ` — ${createRes.json.error}` : ""}`
  );

  if (!planId) {
    throw new Error("Plan not created.");
  }

  const { data: dbRow } = await admin
    .from("ai_execution_plans")
    .select("id, status, plan_json")
    .eq("id", planId)
    .maybeSingle();

  record(
    "Plan persisted in remote DB",
    Boolean(dbRow?.id),
    dbRow?.status ?? "missing"
  );

  const getRes = await apiFetch(ownerJar, `/api/execution/plan/${planId}`);
  record(
    "GET /api/execution/plan/[id]",
    getRes.status === 200 && getRes.json?.plan?.id === planId,
    `HTTP ${getRes.status}`
  );

  const steps = getRes.json?.plan?.plan?.steps ?? [];
  const stepPatches = steps
    .filter((s) => s.requiresConfirmation)
    .map((s) => ({ stepId: s.id, approved: true }));

  if (stepPatches.length) {
    const patchRes = await apiFetch(ownerJar, `/api/execution/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepPatches, status: "approved" }),
    });
    record(
      "PATCH approve steps",
      patchRes.status === 200,
      `HTTP ${patchRes.status} — ${stepPatches.length} step(s)`
    );
  } else {
    record("PATCH approve steps", true, "no confirmation steps");
  }

  if (SKIP_EXECUTE) {
    record("POST execute (skipped)", true, "SKIP_EXECUTE=1");
  } else if (!process.env.OPENAI_API_KEY?.trim()) {
    record("POST execute", false, "BLOCKED — OPENAI_API_KEY");
  } else {
    const execRes = await apiFetch(ownerJar, `/api/execution/plan/${planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "execute" }),
    });
    const status = execRes.json?.plan?.status;
    record(
      "POST execute",
      execRes.status === 200,
      `HTTP ${execRes.status} — status ${status ?? "?"}`
    );

    const exec2 = await apiFetch(ownerJar, `/api/execution/plan/${planId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "execute" }),
    });
    const results2 = exec2.json?.results ?? [];
    const dupCampaign = results2.some(
      (r) => r.success && String(r.error ?? "").length === 0
    );
    record(
      "Second execute (idempotency)",
      exec2.status === 200,
      `HTTP ${exec2.status} — no unexpected new failures`
    );

    const { data: after } = await admin
      .from("ai_execution_plans")
      .select("status, plan_json")
      .eq("id", planId)
      .single();
    const auditLen = after?.plan_json?.auditLog?.length ?? 0;
    record(
      "Audit log present",
      auditLen > 0,
      `${auditLen} entries`
    );
  }

  const { jar: viewerJar } = await createAuthedSession("client-a-viewer@adly.test");
  await switchWorkspace(viewerJar, clientAId);
  const viewerExec = await apiFetch(viewerJar, `/api/execution/plan/${planId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "execute" }),
  });
  record(
    "Viewer cannot execute",
    viewerExec.status === 403 || viewerExec.status === 401,
    `HTTP ${viewerExec.status}`
  );
} catch (err) {
  record("Execution API E2E setup", false, err instanceof Error ? err.message : String(err));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed > 0 ? 1 : 0);
