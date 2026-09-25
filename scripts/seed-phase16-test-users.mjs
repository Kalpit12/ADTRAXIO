/**
 * Phase 16 remediation: agency + client workspace test accounts.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/seed-phase16-test-users.mjs
 *
 * Creates:
 *   - Agency org (type: agency)
 *   - agency-owner, agency-manager, agency-editor, agency-viewer (org members)
 *   - Client A + Client B workspaces
 *   - client-a-viewer (member of Client A only)
 *
 * All passwords: AdlyTest2026!
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD = "AdlyTest2026!";

const USERS = [
  { email: "agency-owner@adly.test", name: "Agency Owner", orgRole: "owner" },
  { email: "agency-manager@adly.test", name: "Agency Manager", orgRole: "manager" },
  { email: "agency-editor@adly.test", name: "Agency Editor", orgRole: "editor" },
  { email: "agency-viewer@adly.test", name: "Agency Viewer", orgRole: "viewer" },
  { email: "client-a-viewer@adly.test", name: "Client A Viewer", orgRole: "viewer" },
];

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local from Supabase Dashboard > Settings > API."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser({ email, name }) {
  const { data: listed } = await admin.auth.admin.listUsers();
  const found = listed?.users?.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    return found.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user.id;
}

async function seed() {
  const userIds = {};
  for (const u of USERS) {
    userIds[u.email] = await ensureUser(u);
    await admin.from("profiles").upsert(
      {
        id: userIds[u.email],
        full_name: u.name,
        profile_name: u.name,
        account_type: "agency",
        onboarding_step: 5,
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );
  }

  const ownerId = userIds["agency-owner@adly.test"];

  let orgId;
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingOrg?.id) {
    orgId = existingOrg.id;
    await admin
      .from("organizations")
      .update({ name: "Adly Test Agency", type: "agency" })
      .eq("id", orgId);
  } else {
    const { data: newOrg, error } = await admin
      .from("organizations")
      .insert({ name: "Adly Test Agency", type: "agency", owner_id: ownerId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    orgId = newOrg.id;
  }

  for (const u of USERS) {
    if (u.email === "client-a-viewer@adly.test") continue;
    await admin.from("organization_members").upsert({
      organization_id: orgId,
      user_id: userIds[u.email],
      role: u.orgRole,
    });
  }

  await admin.from("organization_members").upsert({
    organization_id: orgId,
    user_id: userIds["client-a-viewer@adly.test"],
    role: "viewer",
  });

  async function ensureClient(slug, name) {
    const { data: existing } = await admin
      .from("client_workspaces")
      .select("id")
      .eq("agency_organization_id", orgId)
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data, error } = await admin
      .from("client_workspaces")
      .insert({
        agency_organization_id: orgId,
        name,
        slug,
        status: "active",
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  const clientAId = await ensureClient("client-a", "Client A");
  const clientBId = await ensureClient("client-b", "Client B");

  await admin.from("client_workspace_members").upsert({
    client_workspace_id: clientAId,
    user_id: userIds["client-a-viewer@adly.test"],
    role: "viewer",
  });

  console.log("\n✓ Phase 16 test accounts ready\n");
  console.log("  Agency org id:", orgId);
  console.log("  Client A id:  ", clientAId);
  console.log("  Client B id:  ", clientBId);
  console.log("\n  Password (all accounts):", TEST_PASSWORD);
  console.log("\n  Accounts:");
  for (const u of USERS) {
    console.log(`    ${u.email} (${u.orgRole ?? "client member"})`);
  }
  console.log("\n  Login: http://localhost:3000/login");
  console.log("  Switch client workspace via UI before operational tests.\n");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
