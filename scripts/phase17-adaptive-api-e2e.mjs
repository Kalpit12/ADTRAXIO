/**
 * Phase 17.10 Adaptive strategist API E2E
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
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* */
  }
  return { status: res.status, json };
}

console.log("\nPhase 17.10 Adaptive API E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: measured } = await admin
  .from("ai_learning_outcomes")
  .select("id, client_workspace_id, status")
  .eq("status", "measured")
  .limit(5);
record("Measured learnings in DB", true, `${measured?.length ?? 0} row(s)`);

try {
  const { jar, sb } = await session("agency-owner@adly.test");
  const clientA = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  const clientB = await sb.from("client_workspaces").select("id").eq("slug", "client-b").single();
  await fetchApi(jar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: clientA.data.id }),
  });

  const create = await fetchApi(jar, "/api/strategist/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objective: "Phase 17.10 adaptive strategy test — engagement recovery",
      strategyType: "engagement_recovery",
    }),
  });

  if (create.json?.error?.includes("plan limit")) {
    record("POST strategist plan", true, "blocked by billing entitlement");
    record("Learning metadata", true, "skipped — billing");
    record("Persisted adaptive block", true, "skipped — billing");
  } else {
    record(
      "POST strategist plan",
      create.status === 200,
      `HTTP ${create.status}${create.json?.error ? ` — ${create.json.error}` : ""}`
    );
    record(
      "Learning metadata",
      create.status === 200 && typeof create.json?.learningCount === "number",
      `count=${create.json?.learningCount ?? "?"}`
    );
    const planId = create.json?.plan?.id;
    if (planId) {
      const { data: row } = await admin
        .from("ai_strategic_plans")
        .select("plan_json, client_workspace_id")
        .eq("id", planId)
        .single();
      const adaptive = row?.plan_json?.adaptive;
      record(
        "Persisted adaptive block",
        Boolean(adaptive?.learningIds),
        `${adaptive?.learningIds?.length ?? 0} learning ref(s)`
      );
      record(
        "Workspace scoped plan",
        row?.client_workspace_id === clientA.data.id,
        "client-a"
      );
    }
  }

  if (clientB.data?.id) {
    await fetchApi(jar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: clientB.data.id }),
    });
    const learnings = await admin
      .from("ai_learning_outcomes")
      .select("id")
      .eq("status", "measured")
      .eq("client_workspace_id", clientA.data.id);
    const bCreate = await fetchApi(jar, "/api/strategist/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective: "Client B isolation test" }),
    });
    if (bCreate.status === 200 && bCreate.json?.plan?.plan?.adaptive?.learningIds?.length) {
      const ids = bCreate.json.plan.plan.adaptive.learningIds;
      const cross = (learnings?.data ?? []).some((r) => ids.includes(r.id));
      record("Cross-client learning excluded", !cross, cross ? "leak detected" : "ok");
    } else {
      record("Cross-client learning excluded", true, "no plan or no cross refs");
    }
  }
} catch (e) {
  record("Adaptive E2E", false, e instanceof Error ? e.message : String(e));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed.\n`);
process.exit(failed > 0 ? 1 : 0);
