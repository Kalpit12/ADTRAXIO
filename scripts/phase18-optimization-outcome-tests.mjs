/**
 * Phase 18.1 Optimization outcome intelligence tests
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

console.log("\nPhase 18.1 Optimization outcome tests\n");

record("Migration 038 file", existsSync(resolve(root, "supabase/migrations/038_ai_optimization_outcome.sql")));
const mig = read("supabase/migrations/038_ai_optimization_outcome.sql");
record("outcome_json column", mig.includes("outcome_json"));
record("outcome status index", mig.includes("outcome_status_idx"));

record("outcome.ts module", existsSync(resolve(root, "src/lib/optimization/outcome.ts")));
record("outcome-map.ts", existsSync(resolve(root, "src/lib/optimization/outcome-map.ts")));

const outcome = read("src/lib/optimization/outcome.ts");
record("initializeOptimizationOutcome", outcome.includes("initializeOptimizationOutcome"));
record("syncOptimizationOutcome", outcome.includes("syncOptimizationOutcome"));
record("getOptimizationOutcome", outcome.includes("getOptimizationOutcome"));
record("listOptimizationOutcomes", outcome.includes("listOptimizationOutcomes"));
record("listOptimizationOutcomeHistory", outcome.includes("listOptimizationOutcomeHistory"));
record("syncPendingOptimizationOutcomes", outcome.includes("syncPendingOptimizationOutcomes"));
record("formatExecutionSummary", outcome.includes("formatExecutionSummary"));
record("formatOutcomeSummary", outcome.includes("formatOutcomeSummary"));
record("buildObservedDifference", outcome.includes("buildObservedDifference"));
record("classifyPrePostOverall", outcome.includes("classifyPrePostOverall"));
record("higher_observed_result", outcome.includes("higher_observed_result"));
record("No winner language", !outcome.includes('"winner"'));
record("No proved language", !outcome.match(/\bproved\b/i));
record("No caused language", !outcome.match(/\bcaused\b/i));
record("Idempotency key opt-outcome", outcome.includes("opt-outcome:"));
record("runExperimentEvaluation reuse", outcome.includes("runExperimentEvaluation"));
record("measureLearningOutcome after measure", outcome.includes("measureLearningOutcome"));
record("Learning only in sync path", outcome.indexOf("measureLearningOutcome") > outcome.indexOf("syncOptimizationOutcome"));
record("Strategist formatter", outcome.includes("formatOptimizationOutcomesForStrategist"));
record("optimizationProposalId on snapshot path", outcome.includes("optimizationProposalId"));
record("pending status at init", outcome.includes('status: "pending"'));

const types = read("src/lib/optimization/types.ts");
record("OptimizationOutcomeRecord", types.includes("OptimizationOutcomeRecord"));
record("Lifecycle pending", types.includes('"pending"'));
record("Lifecycle evaluated", types.includes('"evaluated"'));
record("Lifecycle insufficient_data", types.includes('"insufficient_data"'));
record("Observed classifications", types.includes("higher_observed_result"));
record("Proposal outcome field", types.includes("outcome: OptimizationOutcomeRecord"));

const exec = read("src/lib/optimization/executor.ts");
record("Executor initializes outcome", exec.includes("initializeOptimizationOutcome"));
record("Executor does not claim success outcome", !exec.includes("optimization worked"));

const service = read("src/lib/optimization/service.ts");
record("mapRow outcome_json", service.includes("outcome_json"));
record("parseOptimizationOutcome", service.includes("parseOptimizationOutcome"));

const expSvc = read("src/lib/experiments/service.ts");
record("measureRunningExperiment sync outcome", expSvc.includes("syncOptimizationOutcome"));

record("Outcomes API", existsSync(resolve(root, "src/app/api/optimization/outcomes/route.ts")));
record("Proposal outcome API", existsSync(resolve(root, "src/app/api/optimization/proposals/[id]/outcome/route.ts")));
const api = read("src/app/api/optimization/outcomes/route.ts");
record("API listOptimizationOutcomeHistory", api.includes("listOptimizationOutcomeHistory"));

const tools = read("src/lib/assistant/tools/optimization.ts");
record("getOptimizationOutcomeTool", tools.includes("getOptimizationOutcomeTool"));
record("getOptimizationOutcomesTool", tools.includes("getOptimizationOutcomesTool"));
record("Read-only note outcomes", tools.includes("Read-only"));

const index = read("src/lib/assistant/tools/index.ts");
record("Tool get_optimization_outcome", index.includes("get_optimization_outcome"));
record("Tool get_optimization_outcomes", index.includes("get_optimization_outcomes"));

const strategist = read("src/lib/strategist/service.ts");
record("Strategist optimizationOutcomesPrompt", strategist.includes("optimizationOutcomesPrompt"));
record("Strategist separate outcomes import", strategist.includes("formatOptimizationOutcomesForStrategist"));

const ctx = read("src/lib/strategist/context.ts");
record("Bundle optimizationOutcomesPrompt", ctx.includes("optimizationOutcomesPrompt"));

const prompts = read("src/lib/strategist/prompts.ts");
record("Prompt optimization outcomes", prompts.includes("optimizationOutcomesHistorical"));

const brief = read("src/lib/agent/brief.ts");
record("Brief measured allocation", brief.includes("allocation change has now been measured"));

const cron = read("src/app/api/cron/optimization-readiness/route.ts");
record("Cron syncPendingOptimizationOutcomes", cron.includes("syncPendingOptimizationOutcomes"));
record("Cron no execute", !cron.includes("executeOptimizationProposal"));

record("History page", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/optimization/history/page.tsx")));
record("History view component", existsSync(resolve(root, "src/components/assistant/optimization-history-view.tsx")));
const hist = read("src/components/assistant/optimization-history-view.tsx");
record("History filters status", hist.includes("status"));
record("History no ranking", !hist.includes("score"));

const detail = read("src/components/assistant/optimization-detail-view.tsx");
record("Detail outcome section", detail.includes("Outcome (post-measurement)"));

record("verify-migration-038", existsSync(resolve(root, "scripts/verify-migration-038.mjs")));
record("package test script", read("package.json").includes("test:optimization-outcome"));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length} tests, ${failed.length} failed\n`);
process.exit(failed.length ? 1 : 0);
