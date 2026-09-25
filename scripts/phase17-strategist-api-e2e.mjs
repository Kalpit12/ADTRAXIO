/**
 * Phase 17.8 — Live strategic plan API flow.
 * Requires: dev server, migration 029, OPENAI_API_KEY
 */
import { createServerClient } from "@supabase/ssr";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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
const SKIP_AI = process.env.SKIP_AI === "1";

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
    /* */
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

console.log(`\nPhase 17.8 Strategist API E2E → ${BASE}\n`);

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: tableErr } = await admin.from("ai_strategic_plans").select("id").limit(1);
record("Migration 029", !tableErr, tableErr?.message ?? "ok");

if (tableErr) process.exit(1);

try {
  const { jar: ownerJar, supabase: ownerSb } = await createAuthedSession(
    "agency-owner@adly.test"
  );
  const { data: workspaces } = await ownerSb
    .from("client_workspaces")
    .select("id, slug")
    .order("slug");
  const clientAId = workspaces?.find((w) => w.slug === "client-a")?.id;
  if (!clientAId) throw new Error("client-a not found");

  await switchWorkspace(ownerJar, clientAId);

  if (SKIP_AI || !process.env.OPENAI_API_KEY?.trim()) {
    record("POST /api/strategist/plan", true, "SKIP_AI — table + auth only");
  } else {
    const createRes = await apiFetch(ownerJar, "/api/strategist/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective: "Phase 17.8 E2E — weekly growth strategy test",
        strategyType: "content_growth",
      }),
    });
    const planId = createRes.json?.plan?.id;
    record(
      "POST /api/strategist/plan",
      createRes.status === 200 && Boolean(planId),
      `HTTP ${createRes.status}${createRes.json?.error ? ` — ${createRes.json.error}` : ""}`
    );

    if (planId) {
      const { data: row } = await admin
        .from("ai_strategic_plans")
        .select("id, evidence_json, plan_json")
        .eq("id", planId)
        .maybeSingle();
      record(
        "Plan persisted remotely",
        Boolean(row?.id),
        `${row?.evidence_json?.length ?? 0} evidence items`
      );

      const getRes = await apiFetch(ownerJar, `/api/strategist/plan/${planId}`);
      record("GET /api/strategist/plan/[id]", getRes.status === 200, `HTTP ${getRes.status}`);

      const actions = getRes.json?.plan?.plan?.actions ?? [];
      const patches = actions.slice(0, 2).map((a) => ({
        actionId: a.id,
        reviewStatus: "approved",
      }));
      if (patches.length) {
        const patchRes = await apiFetch(ownerJar, `/api/strategist/plan/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionPatches: patches }),
        });
        record("PATCH approve actions", patchRes.status === 200, `${patches.length} approved`);

        const prepRes = await apiFetch(ownerJar, `/api/strategist/plan/${planId}/prepare`, {
          method: "POST",
        });
        record(
          "POST prepare → execution plan",
          prepRes.status === 200 && Boolean(prepRes.json?.executionPlanId),
          prepRes.json?.reviewUrl ?? prepRes.json?.error
        );
      }

      const { jar: viewerJar } = await createAuthedSession("client-a-viewer@adly.test");
      await switchWorkspace(viewerJar, clientAId);
      const viewerPrep = await apiFetch(viewerJar, `/api/strategist/plan/${planId}/prepare`, {
        method: "POST",
      });
      record(
        "Viewer cannot prepare",
        viewerPrep.status === 403 || viewerPrep.status === 401,
        `HTTP ${viewerPrep.status}`
      );
    }
  }
} catch (err) {
  record("Strategist E2E", false, err instanceof Error ? err.message : String(err));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed > 0 ? 1 : 0);
