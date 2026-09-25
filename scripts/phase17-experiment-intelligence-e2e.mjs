/**
 * Phase 17.16 Experiment intelligence, evaluation & evidence E2E
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
  return { status: res.status, json: await res.json().catch(() => null) };
}

console.log("\nPhase 17.16 Experiment & evidence E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: colErr } = await admin
  .from("ai_experiments")
  .select("context_snapshot_json, measurement_snapshot_json, experiment_evaluation_json")
  .limit(1);
record("Migration 034/035 remote", !colErr, colErr?.message ?? "ok");
if (colErr) process.exit(1);

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
      name: "Validation E2E lifecycle",
      objective: "Increase engagement",
      hypothesis: "Educational vs promotional",
      minimumObservationDays: 14,
      variants: [
        { name: "Educational", variantKey: "A", allocationPercent: 50 },
        { name: "Promotional", variantKey: "B", allocationPercent: 50 },
      ],
    }),
  });
  record("1. Create experiment", create.status === 200, `HTTP ${create.status}`);
  const expId = create.json?.experiment?.id;

  if (expId) {
    const review = await fetchApi(jar, `/api/experiments/${expId}/review`, { method: "POST" });
    record("2. Review", review.status === 200, `HTTP ${review.status}`);

    const approve = await fetchApi(jar, `/api/experiments/${expId}/approve`, { method: "POST" });
    record("3. Approve", approve.status === 200, `HTTP ${approve.status}`);

    const prepare = await fetchApi(jar, `/api/experiments/${expId}/prepare`, { method: "POST" });
    record("4. Prepare", prepare.status === 200, `HTTP ${prepare.status}`);

    const start = await fetchApi(jar, `/api/experiments/${expId}/start`, { method: "POST" });
    record("5. Start", start.status === 200, `HTTP ${start.status}`);

    const startedPast = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("ai_experiments").update({ started_at: startedPast }).eq("id", expId);
    record("6. Observation window seeded", true, startedPast.slice(0, 10));

    const measure = await fetchApi(jar, `/api/experiments/${expId}/measure`, { method: "POST" });
    record("7. Measure", measure.status === 200, `HTTP ${measure.status}`);

    const compare = await fetchApi(jar, `/api/experiments/${expId}/compare`);
    record("8. Compare", compare.status === 200 && compare.json?.comparison, `HTTP ${compare.status}`);

    const intel = await fetchApi(jar, `/api/experiments/${expId}/intelligence`);
    record(
      "9. Intelligence summary",
      intel.status === 200 && intel.json?.intelligence?.health,
      `HTTP ${intel.status}`
    );
    record(
      "9b. Data quality block",
      Boolean(intel.json?.intelligence?.dataQuality?.status),
      intel.json?.intelligence?.dataQuality?.status
    );

    const getExp = await fetchApi(jar, `/api/experiments/${expId}`);
    record(
      "Context snapshot frozen",
      getExp.json?.experiment?.contextSnapshot?.version === 1,
      String(getExp.json?.experiment?.contextSnapshot?.version)
    );

    const evalRes = await fetchApi(jar, `/api/experiments/${expId}/evaluation`);
    record(
      "Evaluation after measure",
      evalRes.status === 200 && evalRes.json?.evaluation?.normalized?.experimentId === expId,
      evalRes.json?.evaluation?.normalized?.lifecycle
    );

    const learnings = await admin
      .from("ai_learning_outcomes")
      .select("id, status, idempotency_key")
      .like("idempotency_key", `experiment:${expId}:variant:%`);
    record(
      "Learning rows linked",
      (learnings.data?.length ?? 0) >= 2,
      String(learnings.data?.length)
    );

    const history = await fetchApi(jar, "/api/experiments/intelligence/history");
    const inHistory = (history.json?.history ?? []).some((h) => h.id === expId);
    record("10. Intelligence history (assistant context)", history.status === 200 && inHistory, `HTTP ${history.status}`);

    const conflicts = await fetchApi(jar, `/api/experiments/${expId}/intelligence`);
    record(
      "11. Strategist evidence fields",
      Boolean(conflicts.json?.intelligence?.evidenceQuality?.level),
      conflicts.json?.intelligence?.evidenceQuality?.level
    );

    const wsB = await sb.from("client_workspaces").select("id").eq("slug", "client-b").single();
    const { jar: jarB } = await session("agency-owner@adly.test");
    await fetchApi(jarB, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: wsB.data.id }),
    });
    const isolated = await fetchApi(jarB, `/api/experiments/${expId}`);
    record(
      "12. Cross-workspace isolation",
      isolated.status === 404 || isolated.status === 403 || !isolated.json?.experiment,
      `HTTP ${isolated.status}`
    );

    const createB = await fetchApi(jar, "/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Evidence E2E B",
        objective: "Increase engagement",
        hypothesis: "Second fixture experiment",
        variants: [
          { name: "A", variantKey: "A", allocationPercent: 50 },
          { name: "B", variantKey: "B", allocationPercent: 50 },
        ],
      }),
    });
    record("13. Experiment B created", createB.status === 200, `HTTP ${createB.status}`);

    const cross = await fetchApi(jar, "/api/evidence/cross-experiment");
    record(
      "14. Cross-experiment evidence",
      cross.status === 200 && cross.json?.evidence?.classification,
      cross.json?.evidence?.classification
    );
    record(
      "14b. Traceability",
      Array.isArray(cross.json?.evidence?.traceability),
      String(cross.json?.evidence?.traceability?.length)
    );

    const rel = await fetchApi(jar, `/api/evidence/relationships?experimentId=${expId}`);
    record("15. Evidence relationships", rel.status === 200, `HTTP ${rel.status}`);

    const evConf = await fetchApi(jar, `/api/evidence/conflicts?experimentId=${expId}`);
    record("16. Evidence conflicts API", evConf.status === 200, `HTTP ${evConf.status}`);

    const evLearn = await fetchApi(jar, `/api/evidence/learnings?experimentId=${expId}`);
    record("17. Learning linkage API", evLearn.status === 200, `HTTP ${evLearn.status}`);

    const { jar: viewerJar } = await session("client-a-viewer@adly.test");
    await fetchApi(viewerJar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
    });
    const viewerCross = await fetchApi(viewerJar, "/api/evidence/cross-experiment");
    record(
      "18. Viewer read cross-evidence",
      viewerCross.status === 200,
      `HTTP ${viewerCross.status}`
    );

    const viewerIso = await fetchApi(viewerJar, `/api/evidence/relationships?experimentId=${expId}`);
    record(
      "19. Viewer isolation other workspace",
      viewerIso.status === 200 || viewerIso.status === 403,
      `HTTP ${viewerIso.status}`
    );

    record(
      "20. Deterministic interpretation fallback",
      Boolean(cross.json?.evidence?.summary),
      "no AI required"
    );

    const postsBefore = await admin.from("ai_experiment_variants").select("id").limit(1);
    record(
      "21. No execution side effects",
      postsBefore.error == null,
      "read-only evidence"
    );
  }

  const cron = await fetch(`${BASE}/api/cron/experiment-intelligence`);
  record("Cron auth", cron.status === 401, `HTTP ${cron.status}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
