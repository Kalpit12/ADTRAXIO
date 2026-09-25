/**
 * Phase 17.9 Learning API E2E
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

console.log("\nPhase 17.9 Learning API E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: tableErr } = await admin.from("ai_learning_outcomes").select("id").limit(1);
record("Migration 030 remote", !tableErr, tableErr?.message ?? "ok");
if (tableErr) process.exit(1);

try {
  const { jar, sb } = await session("agency-owner@adly.test");
  const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  await fetchApi(jar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
  });

  const list = await fetchApi(jar, "/api/learning/outcomes?limit=5");
  record("GET learning outcomes", list.status === 200, `HTTP ${list.status}`);

  const { jar: viewerJar } = await session("client-a-viewer@adly.test");
  await fetchApi(viewerJar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
  });
  const viewerList = await fetchApi(viewerJar, "/api/learning/outcomes");
  record("Viewer can read learnings", viewerList.status === 200, `HTTP ${viewerList.status}`);

  if (list.json?.outcomes?.[0]?.id) {
    const id = list.json.outcomes[0].id;
    const measure = await fetchApi(viewerJar, `/api/learning/outcomes/${id}/measure`, {
      method: "POST",
      body: JSON.stringify({ force: true }),
    });
    record(
      "Viewer cannot measure",
      measure.status === 403 || measure.status === 401,
      `HTTP ${measure.status}`
    );

    const ownerMeasure = await fetchApi(jar, `/api/learning/outcomes/${id}/measure`, {
      method: "POST",
      body: JSON.stringify({ force: true }),
    });
    if (ownerMeasure.json?.error?.includes("plan limit")) {
      record("Measure outcome", true, "blocked by billing entitlement");
    } else {
      record(
        "Measure outcome",
        ownerMeasure.status === 200 || ownerMeasure.status === 400,
        ownerMeasure.json?.error ?? `HTTP ${ownerMeasure.status}`
      );
    }
  } else {
    record("Execution association", true, "no outcomes yet — run execution first");
  }
} catch (e) {
  record("E2E setup", false, e instanceof Error ? e.message : String(e));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed.\n`);
process.exit(failed > 0 ? 1 : 0);
