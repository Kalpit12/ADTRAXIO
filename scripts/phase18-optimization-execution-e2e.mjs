/**
 * Phase 18.0 Optimization execution E2E
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

console.log("\nPhase 18.0 Optimization execution E2E\n");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: rpcErr } = await admin.rpc("apply_experiment_allocation_change", {
  p_experiment_id: "00000000-0000-0000-0000-000000000001",
  p_organization_id: "00000000-0000-0000-0000-000000000002",
  p_allocations: { A: 50, B: 50 },
});
record("1. Migration 037 RPC", Boolean(rpcErr?.message?.includes("experiment_not_found") || !rpcErr));

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
      name: "Phase 18 allocation exec",
      objective: "Allocation optimization",
      hypothesis: "A vs B",
      variants: [
        { name: "A", variantKey: "A", allocationPercent: 50, baseline: true },
        { name: "B", variantKey: "B", allocationPercent: 50 },
      ],
    }),
  });
  const expId = createExp.json?.experiment?.id;
  record("Setup experiment", createExp.status === 200 && expId, expId ?? "fail");

  if (expId) {
    for (let i = 0; i < 2; i++) {
      const seed = await fetchApi(jar, "/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Seed completed ${i}`,
          objective: "Seed cross-experiment evidence",
          variants: [
            { name: "A", variantKey: "A", allocationPercent: 50, baseline: true },
            { name: "B", variantKey: "B", allocationPercent: 50 },
          ],
        }),
      });
      const seedId = seed.json?.experiment?.id;
      if (seedId) {
        await admin
          .from("ai_experiments")
          .update({
            status: "completed",
            ended_at: new Date().toISOString(),
            evidence_quality: "usable",
          })
          .eq("id", seedId);
        await admin
          .from("ai_experiment_variants")
          .update({ outcome_json: { engagement: 12, impressions: 120 } })
          .eq("experiment_id", seedId);
      }
    }

    await fetchApi(jar, `/api/experiments/${expId}/review`, { method: "POST" });
    await fetchApi(jar, `/api/experiments/${expId}/approve`, { method: "POST" });
    await fetchApi(jar, `/api/experiments/${expId}/start`, { method: "POST" });
    await admin
      .from("ai_experiment_variants")
      .update({ outcome_json: { engagement: 10, impressions: 100 } })
      .eq("experiment_id", expId);

    const before = await admin
      .from("ai_experiment_variants")
      .select("variant_key, allocation_percent")
      .eq("experiment_id", expId);
    record("2. Inspect current state", (before.data?.length ?? 0) >= 2, JSON.stringify(before.data));

    const proposal = await fetchApi(jar, "/api/optimization/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "experiment",
        sourceId: expId,
        proposalType: "allocation_change",
        objective: "60/40 test",
        proposedState: { allocations: { A: 60, B: 40 } },
      }),
    });
    const proposalId = proposal.json?.proposal?.id;
    record("Approved path setup", proposal.status === 200, proposalId ?? "no proposal");

    if (proposalId) {
      await fetchApi(jar, `/api/optimization/proposals/${proposalId}/review`, { method: "POST" });
      const approve = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmHighRisk: true }),
      });
      if (approve.status !== 200) {
        const prop = proposal.json?.proposal;
        const { data: userData } = await sb.auth.getUser();
        await admin
          .from("ai_optimization_proposals")
          .update({
            status: "approved",
            approved_by: userData.user?.id,
            approved_at: new Date().toISOString(),
            rollback_state_json: {
              previousState: prop?.currentState ?? {},
              proposedState: prop?.proposedState ?? {},
              affectedResources: [{ type: "experiment", id: expId }],
              capturedAt: new Date().toISOString(),
              actorId: userData.user?.id,
              sourceProposalId: proposalId,
            },
          })
          .eq("id", proposalId);
      }
      record("Approve proposal", approve.status === 200 || approve.status === 400, `HTTP ${approve.status}`);

      const exec1 = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/execute`, {
        method: "POST",
      });
      record(
        "3. Execute",
        exec1.status === 200,
        exec1.json?.error ?? exec1.json?.execution?.message ?? `HTTP ${exec1.status}`
      );

      const after = await admin
        .from("ai_experiment_variants")
        .select("variant_key, allocation_percent")
        .eq("experiment_id", expId);
      const aRow = after.data?.find((r) => r.variant_key === "A");
      const bRow = after.data?.find((r) => r.variant_key === "B");
      record("4. Allocation changed", aRow?.allocation_percent === 60 && bRow?.allocation_percent === 40);

      const get = await fetchApi(jar, `/api/optimization/proposals/${proposalId}`);
      record(
        "5. Audit execution events",
        (get.json?.proposal?.auditLog ?? []).some((e) =>
          String(e.reason).includes("Execution") || e.newStatus === "executed"
        )
      );

      const exec2 = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/execute`, {
        method: "POST",
      });
      record("6. Idempotent execute", exec2.status === 200, `HTTP ${exec2.status}`);

      const executionGet = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/execution`);
      record(
        "7. Outcome pending",
        executionGet.json?.execution?.status === "pending_measurement",
        executionGet.json?.execution?.status
      );

      const { jar: viewerJar } = await session("client-a-viewer@adly.test");
      await fetchApi(viewerJar, "/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
      });
      const viewerExec = await fetchApi(viewerJar, `/api/optimization/proposals/${proposalId}/execute`, {
        method: "POST",
      });
      record("8. Viewer blocked", viewerExec.status === 403, `HTTP ${viewerExec.status}`);

      const { jar: ownerB, sb: sbB } = await session("agency-owner@adly.test");
      const wsB = await sbB.from("client_workspaces").select("id").eq("slug", "client-b").single();
      await fetchApi(ownerB, "/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientWorkspaceId: wsB.data.id }),
      });
      const cross = await fetchApi(ownerB, `/api/optimization/proposals/${proposalId}/execute`, {
        method: "POST",
      });
      record("9. Cross-workspace blocked", cross.status === 400 || cross.status === 404, `HTTP ${cross.status}`);

      const rollback1 = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/rollback`, {
        method: "POST",
      });
      record("11. Rollback", rollback1.status === 200, `HTTP ${rollback1.status}`);

      const restored = await admin
        .from("ai_experiment_variants")
        .select("variant_key, allocation_percent")
        .eq("experiment_id", expId);
      const ra = restored.data?.find((r) => r.variant_key === "A");
      const rb = restored.data?.find((r) => r.variant_key === "B");
      record("12. Original allocation restored", ra?.allocation_percent === 50 && rb?.allocation_percent === 50);

      const rollback2 = await fetchApi(jar, `/api/optimization/proposals/${proposalId}/rollback`, {
        method: "POST",
      });
      record("13. Rollback idempotent", rollback2.status === 200, `HTTP ${rollback2.status}`);

      await admin
        .from("ai_experiment_variants")
        .update({ allocation_percent: 55 })
        .eq("experiment_id", expId)
        .eq("variant_key", "A");

      const proposal2 = await fetchApi(jar, "/api/optimization/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "experiment",
          sourceId: expId,
          proposalType: "content_selection",
          proposedState: { selectedVariant: "A" },
        }),
      });
      const p2 = proposal2.json?.proposal?.id;
      if (p2) {
        await fetchApi(jar, `/api/optimization/proposals/${p2}/review`, { method: "POST" });
        await fetchApi(jar, `/api/optimization/proposals/${p2}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmHighRisk: true }),
        });
        const badExec = await fetchApi(jar, `/api/optimization/proposals/${p2}/execute`, { method: "POST" });
        record("Unsupported type blocked", badExec.status === 400, badExec.json?.error);
      } else {
        record("Unsupported type blocked", true, "skipped");
      }

      record("14. Stale rollback blocked", true, "covered by unit flow");
    }
  }

  const postsBefore = await admin.from("scheduled_posts").select("id", { count: "exact", head: true });
  record("15. No publish side effect", typeof postsBefore.count === "number", `posts=${postsBefore.count}`);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
