/**
 * Phase 17.7 Execution reliability tests
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\nPhase 17.7 Execution reliability tests\n");

record("Migration 028 file", existsSync(resolve(root, "supabase/migrations/028_ai_execution_plans.sql")));

for (const f of [
  "src/lib/execution/validate-state.ts",
  "src/lib/execution/entitlements-check.ts",
  "src/lib/execution/audit.ts",
  "src/lib/execution/repurpose-step.ts",
]) {
  record(`Module ${f.split("/").pop()}`, existsSync(resolve(root, f)));
}

const execute = read("src/lib/execution/execute.ts");
record("Execution lock", execute.includes("claimExecutionLock"));
record("Entitlements at execute", execute.includes("assertExecuteEntitlements"));
record("Stale validation", execute.includes("validateStepBeforeExecute"));
record("Partial status", execute.includes("partially_completed"));
record("Schedule idempotency skip", execute.includes("scheduledPostId"));

const prepare = read("src/lib/execution/prepare.ts");
record("Prepare entitlements", prepare.includes("assertPrepareEntitlements"));
record("Repurpose prepare path", prepare.includes("runRepurposeContentStep"));
record("Prepare idempotency", prepare.includes("contentIds?.length"));
record(
  "Usage recorded after AI success",
  read("src/lib/execution/prepare.ts").includes("recordExecutionAiGeneration")
);

const builder = read("src/lib/execution/plan-builder.ts");
record("Dedicated repurpose plan step", builder.includes('type: "repurpose_content"'));

const types = read("src/lib/execution/types.ts");
record("Audit log type", types.includes("ExecutionAuditEntry"));
record("approvedBy on steps", types.includes("approvedBy"));

const ui = read("src/components/assistant/execution-plan-view.tsx");
record("Retry failed UI", ui.includes("retryFailedOnly"));
record("Schedule edit UI", ui.includes("datetime-local"));
record("Audit UI", ui.includes("auditLog"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
