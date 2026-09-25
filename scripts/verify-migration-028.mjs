/**
 * Verify migration 028 (ai_execution_plans) on remote Supabase.
 * Usage: node scripts/verify-migration-028.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await supabase.from("ai_execution_plans").select("id").limit(1);

if (!error) {
  console.log("PASS: ai_execution_plans exists and is queryable.");
  process.exit(0);
}

if (
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  error.message.includes("does not exist") ||
  error.message.includes("schema cache")
) {
  console.error("FAIL: ai_execution_plans table missing. Apply migration 028:");
  console.error("  npm run apply:migration-028");
  console.error("  or Supabase SQL Editor: supabase/migrations/028_ai_execution_plans.sql");
  process.exit(2);
}

if (String(error.message).includes("fetch failed") || String(error.message).includes("521")) {
  console.error(
    "FAIL: Supabase unreachable (project may be COMING_UP or paused). Check dashboard, then retry."
  );
  process.exit(3);
}

console.error("FAIL:", error.code, error.message);
process.exit(1);
