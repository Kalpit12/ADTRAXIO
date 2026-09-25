/**
 * Phase 18.0 Optimization execution tests
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

console.log("\nPhase 18.0 Optimization execution tests\n");

record("Migration 037 file", existsSync(resolve(root, "supabase/migrations/037_ai_optimization_execution.sql")));
const mig = read("supabase/migrations/037_ai_optimization_execution.sql");
record("execution_json column", mig.includes("execution_json"));
record("execution_lock_at", mig.includes("execution_lock_at"));
record("apply_experiment_allocation_change RPC", mig.includes("apply_experiment_allocation_change"));
record("RPC requires running", mig.includes("experiment_not_running"));
record("RPC total 100 check", mig.includes("allocation_total_not_100"));

for (const f of ["executor.ts", "execution-safety.ts", "execution-map.ts", "execution-refs.ts"]) {
  record(`Module optimization/${f}`, existsSync(resolve(root, `src/lib/optimization/${f}`)));
}

const exec = read("src/lib/optimization/executor.ts");
record("executeOptimizationProposal", exec.includes("executeOptimizationProposal"));
record("rollbackOptimizationProposal", exec.includes("rollbackOptimizationProposal"));
record("Idempotent executed return", exec.includes('proposal.status === "executed"'));
record("Execution lock", exec.includes("execution_lock_at"));
record("Only allocation_change execute", exec.includes("allocation_change"));
record("pending_measurement message", exec.includes("Outcome measurement is pending"));
record("verifyApprovalIntegrity", exec.includes("approvedBy"));
record("RPC apply", exec.includes("apply_experiment_allocation_change"));
record("RPC via service role admin", exec.includes("createAdminClient"));

const safety = read("src/lib/optimization/execution-safety.ts");
record("validateProposedAllocations", safety.includes("validateProposedAllocations"));
record("verifyRecordedCurrentState", safety.includes("verifyRecordedCurrentState"));
record("running experiment required", safety.includes("running"));

const types = read("src/lib/optimization/types.ts");
record("OptimizationExecutionRecord", types.includes("OptimizationExecutionRecord"));
record("execution_succeeded audit event", types.includes("execution_succeeded"));
record("rollback_succeeded event", types.includes("rollback_succeeded"));

record("Execute API route", existsSync(resolve(root, "src/app/api/optimization/proposals/[id]/execute/route.ts")));
record("Rollback API route", existsSync(resolve(root, "src/app/api/optimization/proposals/[id]/rollback/route.ts")));
record("Execution GET route", existsSync(resolve(root, "src/app/api/optimization/proposals/[id]/execution/route.ts")));

const perms = read("src/lib/optimization/permissions.ts");
record("assertOptimizationExecute", perms.includes("assertOptimizationExecute"));

const tools = read("src/lib/assistant/tools/optimization.ts");
record("executeOptimizationTool", tools.includes("executeOptimizationTool"));
record("createPendingAction for execute", tools.includes("execute_optimization"));
record("Approved only for execute tool", tools.includes('proposal.status !== "approved"'));

const confirm = read("src/lib/assistant/confirmations.ts");
record("confirm execute_optimization", confirm.includes("execute_optimization"));
record("confirm rollback_optimization", confirm.includes("rollback_optimization"));

const index = read("src/lib/assistant/tools/index.ts");
record("Tool execute_optimization registered", index.includes("name: \"execute_optimization\""));
record("Tool rollback_optimization registered", index.includes("name: \"rollback_optimization\""));

const ui = read("src/components/assistant/optimization-detail-view.tsx");
record("UI Execute approved change", ui.includes("Execute approved change"));
record("UI confirmation dialog", ui.includes("Apply this allocation change"));
record("UI Rollback confirmation", ui.includes("Confirm rollback"));
record("UI no auto execute", !ui.includes("autoExecute"));

const elig = read("src/lib/optimization/eligibility.ts");
record("Running allocation eligibility", elig.includes('exp.status === "running"'));

const snap = read("src/lib/experiments/measurement-snapshot.ts");
record("optimizationProposalId on snapshot", snap.includes("optimizationProposalId"));

const brief = read("src/lib/agent/brief.ts");
record("Brief awaiting measurement", brief.includes("awaiting measurement"));

const strategist = read("src/lib/strategist/service.ts");
record("Strategist executed note", strategist.includes("EXECUTED OPTIMIZATION"));

record("No bandit in executor", !exec.includes("bandit"));
record("No auto publish in executor", !exec.includes("publishNow"));
record("No budget in executor", !exec.includes("budget"));
record("St stale rollback block", exec.includes("does not match executed state"));

record("package test:optimization-execution", read("package.json").includes("test:optimization-execution"));
record("verify-migration-037 script", existsSync(resolve(root, "scripts/verify-migration-037.mjs")));
record("E2E script", existsSync(resolve(root, "scripts/phase18-optimization-execution-e2e.mjs")));
record("requireOptimizationExecute api-auth", read("src/lib/optimization/api-auth.ts").includes("requireOptimizationExecute"));
record("Executor does not set executed without RPC", !exec.includes("allocation_percent ="));
record("Rollback idempotent branch", exec.includes('"rolled_back"'));
record("Execution refs helper", read("src/lib/optimization/execution-refs.ts").includes("findLatestExecutedOptimizationForExperiment"));
record("Service maps execution", read("src/lib/optimization/service.ts").includes("executionId"));
record("Assistant external risk execute", index.includes('execute_optimization') && index.includes('"external"'));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
