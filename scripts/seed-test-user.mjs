/**
 * Creates a demo Adly test account in Supabase.
 *
 * Requires in .env.local (or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/seed-test-user.mjs
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

const TEST_EMAIL = "demo@adly.io";
const TEST_PASSWORD = "AdlyDemo2026!";
const TEST_NAME = "Demo User";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to .env.local, then run: node scripts/seed-test-user.mjs"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === TEST_EMAIL);

  let userId = found?.id;

  if (found) {
    console.log("Test user already exists — updating profile…");
    await admin.auth.admin.updateUserById(found.id, {
      password: TEST_PASSWORD,
      user_metadata: { full_name: TEST_NAME },
      email_confirm: true,
    });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: TEST_NAME },
    });

    if (error) {
      console.error("Failed to create user:", error.message);
      process.exit(1);
    }

    userId = data.user.id;
    console.log("Created test user.");
  }

  if (!userId) {
    console.error("Could not resolve user id.");
    process.exit(1);
  }

  await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: TEST_NAME,
      profile_name: "Adly Demo Co.",
      account_type: "business",
      industry: "Technology",
      location: "San Francisco, CA",
      website: "https://adly.io",
      description: "Demo workspace for testing Adly.",
      onboarding_step: 5,
      onboarding_completed: true,
    },
    { onConflict: "id" }
  );

  const goals = [
    "generate_leads",
    "brand_awareness",
    "improve_engagement",
  ];
  await admin.from("user_goals").delete().eq("user_id", userId);
  await admin.from("user_goals").insert(
    goals.map((goal) => ({ user_id: userId, goal }))
  );

  const platforms = ["instagram", "linkedin", "facebook"];
  await admin.from("user_platforms").delete().eq("user_id", userId);
  await admin.from("user_platforms").insert(
    platforms.map((platform) => ({
      user_id: userId,
      platform,
      connected: false,
    }))
  );

  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  let orgId = org?.id;

  if (!orgId) {
    const { data: newOrg, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: "Adly Demo Co.",
        type: "business",
        owner_id: userId,
      })
      .select("id")
      .single();

    if (orgError) {
      console.error("Failed to create organization:", orgError.message);
      process.exit(1);
    }

    orgId = newOrg.id;

    await admin.from("organization_members").upsert({
      organization_id: orgId,
      user_id: userId,
      role: "owner",
    });
  }

  console.log("\n✓ Test account ready\n");
  console.log("  Email:    ", TEST_EMAIL);
  console.log("  Password: ", TEST_PASSWORD);
  console.log("\n  Login at: http://localhost:3000/login");
  console.log("  Then visit: http://localhost:3000/dashboard\n");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
