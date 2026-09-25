/**
 * Phase 16 authenticated tests (Supabase RLS + login verification).
 *
 * Prerequisites:
 *   1. node scripts/seed-phase16-test-users.mjs (requires SUPABASE_SERVICE_ROLE_KEY)
 *   2. Dev server optional — these tests hit Supabase directly
 *
 * Usage: node scripts/phase16-authenticated-tests.mjs
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
const TEST_PASSWORD = "AdlyTest2026!";

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

console.log("\nPhase 16 authenticated tests (Supabase RLS)\n");

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

let ownerClient;
let viewerClient;
let clientAId;
let clientBId;
let orgId;

try {
  ownerClient = await signIn("agency-owner@adly.test");
  record("Agency owner login", true, "agency-owner@adly.test");

  const { data: orgs, error: orgErr } = await ownerClient
    .from("organizations")
    .select("id, type, name")
    .eq("type", "agency")
    .limit(1)
    .maybeSingle();

  if (orgErr || !orgs?.id) {
    record("Agency org exists", false, orgErr?.message ?? "not found — run seed script");
  } else {
    orgId = orgs.id;
    record("Agency org exists", true, orgs.name);
  }

  const { data: clients, error: clientsErr } = await ownerClient
    .from("client_workspaces")
    .select("id, slug, name")
    .order("slug");

  if (clientsErr) {
    record("List client workspaces", false, clientsErr.message);
  } else {
    const slugs = (clients ?? []).map((c) => c.slug);
    clientAId = clients?.find((c) => c.slug === "client-a")?.id;
    clientBId = clients?.find((c) => c.slug === "client-b")?.id;
    record(
      "Client A + B workspaces",
      slugs.includes("client-a") && slugs.includes("client-b"),
      slugs.join(", ") || "none"
    );
  }

  if (clientAId) {
    const { data: members, error: membersErr } = await ownerClient
      .from("client_workspace_members")
      .select("user_id, role")
      .eq("client_workspace_id", clientAId);

    record(
      "Owner reads Client A membership",
      !membersErr && (members?.length ?? 0) >= 1,
      membersErr?.message ?? `${members?.length ?? 0} member(s)`
    );
  }

  viewerClient = await signIn("client-a-viewer@adly.test");
  record("Client A viewer login", true, "client-a-viewer@adly.test");

  const { data: viewerClients, error: viewerClientsErr } = await viewerClient
    .from("client_workspaces")
    .select("id, slug");

  if (viewerClientsErr) {
    record("Viewer client workspace visibility", false, viewerClientsErr.message);
  } else {
    const viewerSlugs = (viewerClients ?? []).map((c) => c.slug);
    record(
      "Viewer sees Client A only (RLS)",
      viewerSlugs.includes("client-a") && !viewerSlugs.includes("client-b"),
      viewerSlugs.join(", ") || "none"
    );
  }

  if (clientBId) {
    const { data: crossClients } = await viewerClient
      .from("client_workspaces")
      .select("id")
      .eq("id", clientBId);

    record(
      "Viewer cannot see Client B workspace",
      (crossClients?.length ?? 0) === 0,
      `${crossClients?.length ?? 0} workspace row(s)`
    );
  }

  const managerClient = await signIn("agency-manager@adly.test");
  record("Agency manager login", true, "agency-manager@adly.test");

  const { data: managerOrgs } = await managerClient
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId ?? "")
    .limit(1)
    .maybeSingle();

  record(
    "Manager org role",
    managerOrgs?.role === "manager",
    managerOrgs?.role ?? "unknown"
  );
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Invalid login credentials")) {
    record(
      "Test accounts seeded",
      false,
      "Run: node scripts/seed-phase16-test-users.mjs (needs SUPABASE_SERVICE_ROLE_KEY)"
    );
  } else {
    record("Authenticated test setup", false, msg);
  }
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed > 0 ? 1 : 0);
