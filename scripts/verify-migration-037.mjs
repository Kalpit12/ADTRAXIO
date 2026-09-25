import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { error } = await supabase
  .from("ai_optimization_proposals")
  .select("execution_json, execution_id")
  .limit(1);
if (!error) {
  const { error: rpcError } = await supabase.rpc("apply_experiment_allocation_change", {
    p_experiment_id: "00000000-0000-0000-0000-000000000001",
    p_organization_id: "00000000-0000-0000-0000-000000000002",
    p_allocations: { A: 50, B: 50 },
  });
  if (rpcError?.message?.includes("experiment_not_found")) {
    console.log("PASS: execution columns and RPC available.");
    process.exit(0);
  }
}
console.error("FAIL:", error?.message ?? "RPC missing");
process.exit(2);
