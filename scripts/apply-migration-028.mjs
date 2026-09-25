/**
 * Apply migration 028 when Supabase CLI is linked (IPv4).
 * Prerequisite: npx supabase link --project-ref nekcjoljqchfduosmsvi
 * Then: node scripts/apply-migration-028.mjs
 */
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const push = spawnSync(
  "npx",
  ["supabase", "db", "push", "--workdir", root],
  { stdio: "inherit", shell: true, cwd: root }
);

if (push.status !== 0) {
  console.error(
    "\nIf db push failed with IPv6 error, run:\n  npx supabase link --project-ref nekcjoljqchfduosmsvi\nThen re-run this script.\n\nAlternatively paste supabase/migrations/028_ai_execution_plans.sql into Supabase SQL Editor.\n"
  );
  process.exit(push.status ?? 1);
}

const verify = spawnSync("node", ["scripts/verify-migration-028.mjs"], {
  stdio: "inherit",
  cwd: root,
  shell: true,
});

process.exit(verify.status ?? 0);
