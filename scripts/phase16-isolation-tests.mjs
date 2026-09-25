/**
 * Phase 16 workspace isolation — RLS cross-client verification.
 * Seeds marker rows via service role, verifies Client A viewer cannot read Client B.
 *
 * Usage: node scripts/phase16-isolation-tests.mjs
 */

import { createClient } from "@supabase/supabase-js";
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
const TEST_PASSWORD = "AdlyTest2026!";
const MARKER = "phase16-isolation-marker";

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email) {
  const bootstrap = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await bootstrap.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertNoCrossClientRead(client, table, clientBId, filter = "client_workspace_id") {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq(filter, clientBId);
  if (error) {
    const recursion = error.message.includes("infinite recursion");
    record(
      `Viewer: no Client B ${table}`,
      recursion ? false : true,
      error.message
    );
    return;
  }
  record(
    `Viewer: no Client B ${table}`,
    (data?.length ?? 0) === 0,
    `${data?.length ?? 0} row(s)`
  );
}

console.log("\nPhase 16 workspace isolation tests\n");

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let orgId, ownerId, clientAId, clientBId;

try {
  const { data: usersList } = await admin.auth.admin.listUsers();
  ownerId = usersList?.users?.find((u) => u.email === "agency-owner@adly.test")?.id;

  const { data: org } = await admin
    .from("organizations")
    .select("id, owner_id")
    .eq("owner_id", ownerId ?? "")
    .maybeSingle();
  orgId = org?.id ?? null;

  const { data: workspaces } = await admin
    .from("client_workspaces")
    .select("id, slug")
    .eq("agency_organization_id", orgId);
  clientAId = workspaces?.find((w) => w.slug === "client-a")?.id;
  clientBId = workspaces?.find((w) => w.slug === "client-b")?.id;

  if (!orgId || !clientAId || !clientBId) {
    record("Test fixtures", false, "Run seed-phase16-test-users.mjs first");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: contentB } = await admin
    .from("content")
    .insert({
      user_id: ownerId,
      organization_id: orgId,
      client_workspace_id: clientBId,
      content_type: "post",
      platform: "facebook",
      goal: "awareness",
      tone: "professional",
      topic: `${MARKER}-content-b`,
      headline: `${MARKER} Client B content`,
      status: "draft",
    })
    .select("id")
    .single();

  const { data: campaignB } = await admin
    .from("campaigns")
    .insert({
      organization_id: orgId,
      client_workspace_id: clientBId,
      name: `${MARKER} Client B campaign`,
      status: "draft",
    })
    .select("id")
    .single();

  const { data: reportB } = await admin
    .from("reports")
    .insert({
      organization_id: orgId,
      client_workspace_id: clientBId,
      created_by: ownerId,
      name: `${MARKER} Client B report`,
      date_from: today,
      date_to: today,
      status: "draft",
      visibility: "internal",
    })
    .select("id")
    .single();

  const { data: recB } = await admin
    .from("ai_recommendations")
    .insert({
      organization_id: orgId,
      client_workspace_id: clientBId,
      period_start: today,
      period_end: today,
      type: "growth",
      title: `${MARKER} Client B intelligence`,
      recommendation: "test",
      status: "new",
    })
    .select("id")
    .single();

  await admin.from("notifications").insert({
    organization_id: orgId,
    client_workspace_id: clientBId,
    recipient_id: ownerId,
    type: "test",
    title: `${MARKER} Client B notification`,
    body: "isolation test",
  });

  record("Isolation fixtures seeded", true, "Client B marker rows");

  const viewer = await signIn("client-a-viewer@adly.test");

  await assertNoCrossClientRead(viewer, "client_workspace_members", clientBId);
  await assertNoCrossClientRead(viewer, "content", clientBId);
  await assertNoCrossClientRead(viewer, "campaigns", clientBId);
  await assertNoCrossClientRead(viewer, "reports", clientBId);
  await assertNoCrossClientRead(viewer, "ai_recommendations", clientBId);
  await assertNoCrossClientRead(viewer, "notifications", clientBId);

  const { data: analyticsB } = await viewer
    .from("analytics_daily")
    .select("id")
    .eq("client_workspace_id", clientBId);
  record(
    "Viewer: no Client B analytics_daily",
    (analyticsB?.length ?? 0) === 0,
    `${analyticsB?.length ?? 0} row(s)`
  );

  if (contentB?.id) {
    const { data: directContent, error: contentErr } = await viewer
      .from("content")
      .select("id")
      .eq("id", contentB.id)
      .maybeSingle();
    record(
      "Viewer: IDOR content by Client B id",
      contentErr ? true : !directContent,
      contentErr?.message ?? (directContent ? "leaked" : "blocked")
    );
  }

  if (campaignB?.id) {
    const { data: directCampaign, error: campErr } = await viewer
      .from("campaigns")
      .select("id")
      .eq("id", campaignB.id)
      .maybeSingle();
    record(
      "Viewer: IDOR campaign by Client B id",
      campErr ? true : !directCampaign,
      campErr?.message ?? (directCampaign ? "leaked" : "blocked")
    );
  }

  if (reportB?.id) {
    const { data: directReport, error: repErr } = await viewer
      .from("reports")
      .select("id")
      .eq("id", reportB.id)
      .maybeSingle();
    record(
      "Viewer: IDOR report by Client B id",
      repErr ? true : !directReport,
      repErr?.message ?? (directReport ? "leaked" : "blocked")
    );
  }

  const owner = await signIn("agency-owner@adly.test");
  const { data: members, error: membersErr } = await owner
    .from("client_workspace_members")
    .select("user_id, role")
    .eq("client_workspace_id", clientAId);

  record(
    "Owner reads Client A membership (post-019)",
    !membersErr && (members?.length ?? 0) >= 1,
    membersErr?.message ?? `${members?.length ?? 0} member(s)`
  );

  const ownerWrite = await signIn("agency-owner@adly.test");
  const { error: ownerInsertErr } = await ownerWrite.from("campaigns").insert({
    organization_id: orgId,
    client_workspace_id: clientAId,
    name: `${MARKER} owner campaign`,
    status: "draft",
  });
  record(
    "Owner can insert Client A campaign (RLS)",
    !ownerInsertErr,
    ownerInsertErr?.message ?? "created"
  );

  const orgViewer = await signIn("agency-viewer@adly.test");
  const { error: viewerWriteErr } = await orgViewer.from("campaigns").insert({
    organization_id: orgId,
    client_workspace_id: clientAId,
    name: `${MARKER} viewer should fail`,
    status: "draft",
  });
  record(
    "Org viewer cannot insert Client A campaign (RLS)",
    Boolean(viewerWriteErr),
    viewerWriteErr?.message ?? "unexpected write allowed"
  );

  const cleanupIds = [
    contentB?.id && { table: "content", id: contentB.id },
    campaignB?.id && { table: "campaigns", id: campaignB.id },
    reportB?.id && { table: "reports", id: reportB.id },
    recB?.id && { table: "ai_recommendations", id: recB.id },
  ].filter(Boolean);
  for (const row of cleanupIds) {
    await admin.from(row.table).delete().eq("id", row.id);
  }
  await admin
    .from("notifications")
    .delete()
    .eq("title", `${MARKER} Client B notification`);
  await admin.from("campaigns").delete().like("name", `${MARKER}%`);
} catch (err) {
  record("Isolation test setup", false, err instanceof Error ? err.message : String(err));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed > 0 ? 1 : 0);
