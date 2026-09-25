/**
 * Verify migration 029 (ai_strategic_plans) on remote Supabase.
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await supabase.from("ai_strategic_plans").select("id").limit(1);

if (!error) {
  console.log("PASS: ai_strategic_plans exists and is queryable.");
  process.exit(0);
}

if (
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  error.message.includes("schema cache")
) {
  console.error("FAIL: ai_strategic_plans missing. Apply migration 029.");
  process.exit(2);
}

console.error("FAIL:", error.code, error.message);
process.exit(1);
