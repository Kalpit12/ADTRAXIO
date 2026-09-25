/**
 * Phase 17.12 Experiment API E2E
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

console.log("\nPhase 17.12 Experiment API E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: tableErr } = await admin.from("ai_experiments").select("id").limit(1);
record("Migration 032 remote", !tableErr, tableErr?.message ?? "ok");
if (tableErr) process.exit(1);

try {
  const { jar, sb } = await session("agency-owner@adly.test");
  const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  await fetchApi(jar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
  });

  const create = await fetchApi(jar, "/api/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E engagement test",
      objective: "Increase engagement",
      hypothesis: "Educational vs promotional",
      variants: [
        { name: "Educational", variantKey: "A", allocationPercent: 50 },
        { name: "Promotional", variantKey: "B", allocationPercent: 50 },
      ],
    }),
  });
  record("Create experiment", create.status === 200, `HTTP ${create.status}`);
  const expId = create.json?.experiment?.id;

  if (expId) {
    const get = await fetchApi(jar, `/api/experiments/${expId}`);
    record("Get experiment", get.status === 200, `HTTP ${get.status}`);
    record(
      "Two variants",
      (get.json?.experiment?.variants?.length ?? 0) >= 2,
      String(get.json?.experiment?.variants?.length)
    );

    const badAlloc = await fetchApi(jar, "/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad alloc",
        objective: "Test",
        variants: [
          { name: "A", variantKey: "A", allocationPercent: 40 },
          { name: "B", variantKey: "B", allocationPercent: 40 },
        ],
      }),
    });
    record("Allocation validation on create", badAlloc.status === 400, `HTTP ${badAlloc.status}`);

    await fetchApi(jar, `/api/experiments/${expId}/review`, { method: "POST" });
    const approve = await fetchApi(jar, `/api/experiments/${expId}/approve`, { method: "POST" });
    record("Owner approve", approve.status === 200, `HTTP ${approve.status}`);

    const { jar: viewerJar } = await session("client-a-viewer@adly.test");
    await fetchApi(viewerJar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
    });
    const viewerApprove = await fetchApi(viewerJar, `/api/experiments/${expId}/approve`, {
      method: "POST",
    });
    record(
      "Viewer cannot approve",
      viewerApprove.status === 403 || viewerApprove.status === 401,
      `HTTP ${viewerApprove.status}`
    );
    const viewerStart = await fetchApi(viewerJar, `/api/experiments/${expId}/start`, {
      method: "POST",
    });
    record(
      "Viewer cannot start",
      viewerStart.status === 403 || viewerStart.status === 401,
      `HTTP ${viewerStart.status}`
    );

    const compare = await fetchApi(jar, `/api/experiments/${expId}/compare`);
    record("Comparison retrieval", compare.status === 200, `HTTP ${compare.status}`);
  }

  const cronNoAuth = await fetch(`${BASE}/api/cron/experiments`);
  record("Cron rejects missing secret", cronNoAuth.status === 401, `HTTP ${cronNoAuth.status}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
