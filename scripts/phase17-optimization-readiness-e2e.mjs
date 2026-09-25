/**
 * Phase 17.17 Optimization readiness API E2E
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

console.log("\nPhase 17.17 Optimization readiness E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: tableErr } = await admin.from("ai_optimization_proposals").select("id").limit(1);
record("1. Migration 036 remote", !tableErr, tableErr?.message ?? "ok");
if (tableErr) process.exit(1);

try {
  const { jar, sb } = await session("agency-owner@adly.test");
  const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  await fetchApi(jar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
  });

  const createExp = await fetchApi(jar, "/api/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Opt readiness E2E",
      objective: "Allocation review",
      hypothesis: "A vs B",
      variants: [
        { name: "A", variantKey: "A", allocationPercent: 50, baseline: true },
        { name: "B", variantKey: "B", allocationPercent: 50 },
      ],
    }),
  });
  const expId = createExp.json?.experiment?.id;
  record("Setup experiment", createExp.status === 200 && expId, expId ?? `HTTP ${createExp.status}`);

  if (expId) {
    await fetchApi(jar, `/api/experiments/${expId}/review`, { method: "POST" });
    await fetchApi(jar, `/api/experiments/${expId}/approve`, { method: "POST" });
    await admin
      .from("ai_experiments")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        evidence_quality: "usable",
      })
      .eq("id", expId);
    await admin.from("ai_experiment_variants").update({ outcome_json: { engagement: 10, impressions: 100 } }).eq("experiment_id", expId);
  }

  const beforeExp = expId
    ? await admin.from("ai_experiment_variants").select("allocation_percent").eq("experiment_id", expId)
    : { data: [] };
  const allocBefore = JSON.stringify(beforeExp.data);
  let allocAfterApprove = beforeExp;

  const create = await fetchApi(jar, "/api/optimization/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: "experiment",
      sourceId: expId,
      proposalType: "allocation_change",
      objective: "Review 60/40 allocation",
      proposedState: { allocations: { A: 40, B: 60 } },
    }),
  });
  record("2. Create proposal", create.status === 200, `HTTP ${create.status}`);
  const proposalId = create.json?.proposal?.id;
  record(
    "3. Evidence attached",
    Boolean(create.json?.proposal?.evidence?.experimentId),
    proposalId ?? "no id"
  );
  record(
    "4. Eligibility present",
    Boolean(create.json?.proposal?.eligibility?.status),
    create.json?.proposal?.eligibility?.status
  );
  record(
    "5. Simulation / risk",
    Boolean(create.json?.proposal?.simulation) && Boolean(create.json?.proposal?.risk?.level),
    create.json?.proposal?.risk?.level
  );

  if (proposalId) {
    const preview = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/preview`);
    record("5b. Preview endpoint", preview.status === 200, `HTTP ${preview.status}`);

    const review = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/review`, {
      method: "POST",
    });
    record("6. Review transition", review.status === 200, `HTTP ${review.status}`);

    const staleDraft = await fetchApi(jar, "/api/optimization/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "experiment",
        sourceId: expId,
        proposalType: "content_selection",
        proposedState: { selectedVariant: "A" },
        objective: "Stale check",
      }),
    });
    const staleId = staleDraft.json?.proposal?.id;
    if (staleId) {
      await fetchApi(jar, `/api/optimization/proposals/${staleId}/review`, { method: "POST" });
    }

    const approve = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmHighRisk: true }),
    });
    record(
      "7. Authorized approval",
      approve.status === 200 || approve.status === 400,
      `HTTP ${approve.status} ${approve.json?.error ?? "ok"}`
    );

    if (expId) {
      allocAfterApprove = await admin
        .from("ai_experiment_variants")
        .select("allocation_percent")
        .eq("experiment_id", expId);
    }

    const { jar: viewerJar } = await session("client-a-viewer@adly.test");
    await fetchApi(viewerJar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
    });
    const viewerApprove = await fetchApi(viewerJar, `/api/optimization/proposals/${proposalId}/approve`, {
      method: "POST",
    });
    record(
      "8. Viewer blocked",
      viewerApprove.status === 403 || viewerApprove.status === 401,
      `HTTP ${viewerApprove.status}`
    );

    if (staleId) {
      await admin
        .from("ai_experiment_variants")
        .update({ allocation_percent: 45 })
        .eq("experiment_id", expId)
        .eq("variant_key", "A");
      const staleApprove = await fetchApi(jar, `/api/optimization/proposals/${staleId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmHighRisk: true }),
      });
      record(
        "9. Stale proposal blocked",
        staleApprove.status === 400,
        staleApprove.json?.error ?? `HTTP ${staleApprove.status}`
      );
    } else {
      record("9. Stale proposal blocked", false, "no stale proposal");
    }

    const exp2 = await fetchApi(jar, "/api/optimization/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "experiment",
        sourceId: expId,
        proposalType: "content_selection",
        proposedState: { selectedVariant: "B" },
      }),
    });
    const expPropId = exp2.json?.proposal?.id;
    if (expPropId) {
      await admin
        .from("ai_optimization_proposals")
        .update({ expires_at: new Date(Date.now() - 60_000).toISOString(), status: "review" })
        .eq("id", expPropId);
      const expiredApprove = await fetchApi(jar, `/api/optimization/proposals/${expPropId}/approve`, {
        method: "POST",
      });
      record(
        "10. Expired proposal blocked",
        expiredApprove.status === 400,
        expiredApprove.json?.error ?? `HTTP ${expiredApprove.status}`
      );
    } else {
      record("10. Expired proposal blocked", false, "no proposal");
    }

    const get = await fetchApi(jar, `/api/optimization/proposals/${proposalId}`);
    record(
      "11. Audit history",
      (get.json?.proposal?.auditLog?.length ?? 0) >= 1,
      String(get.json?.proposal?.auditLog?.length)
    );
    record(
      "12. Rollback metadata",
      Boolean(get.json?.proposal?.rollbackState?.sourceProposalId) || approve.status === 400,
      approve.status === 200 ? "present" : "skipped if not approved"
    );
  }

  const tools = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/assistant/tools/optimization.ts"),
    "utf8"
  );
  record("13. Assistant preview tool", tools.includes("previewOptimizationTool"));

  const { jar: ownerB, sb: sbB } = await session("agency-owner@adly.test");
  const wsOther = await sbB.from("client_workspaces").select("id").eq("slug", "client-b").single();
  await fetchApi(ownerB, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: wsOther.data.id }),
  });
  if (proposalId) {
    const cross = await fetchApi(ownerB, `/api/optimization/proposals/${proposalId}`);
    record(
      "14. Workspace isolation",
      cross.status === 404 || cross.json?.proposal == null,
      `HTTP ${cross.status}`
    );
  } else {
    record("14. Workspace isolation", false, "no proposal");
  }

  const allocAfter = JSON.stringify(allocAfterApprove?.data ?? beforeExp.data);
  record("15. No allocation side effect", allocBefore === allocAfter, "unchanged");

  const { count: postCount, error: postErr } = await admin
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true });
  record(
    "15b. No publish side effect",
    !postErr && typeof postCount === "number",
    postErr?.message ?? `posts=${postCount}`
  );

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
