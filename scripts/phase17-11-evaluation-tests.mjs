/**
 * Phase 17.11 Strategy evaluation tests
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

console.log("\nPhase 17.11 Strategy evaluation tests\n");

record(
  "Migration 031 file",
  existsSync(resolve(root, "supabase/migrations/031_ai_strategy_evaluations.sql"))
);
const mig = read("supabase/migrations/031_ai_strategy_evaluations.sql");
record("Table ai_strategy_evaluations", mig.includes("ai_strategy_evaluations"));
record("Evaluation statuses", mig.includes("insufficient_data") && mig.includes("inconclusive"));
record("RLS enabled", mig.includes("enable row level security"));
record("Idempotency unique", mig.includes("idempotency_key"));
record("Experiment metadata", mig.includes("experiment_id"));
record("Indexes", mig.includes("ai_strategy_evaluations_measured_at_idx"));

for (const f of [
  "types.ts",
  "context.ts",
  "baseline.ts",
  "measure.ts",
  "compare.ts",
  "attribution.ts",
  "service.ts",
  "validation.ts",
  "prompts.ts",
  "openai.ts",
  "integration.ts",
  "permissions.ts",
  "api-auth.ts",
]) {
  record(`Module ${f}`, existsSync(resolve(root, `src/lib/evaluation/${f}`)));
}

const baseline = read("src/lib/evaluation/baseline.ts");
record("Baseline reuse from learning", baseline.includes("listOutcomesForExecutionPlan"));
record("Outcome reuse", baseline.includes("captureEvaluationOutcome"));

const compare = read("src/lib/evaluation/compare.ts");
record("Objective-specific metrics", compare.includes("OBJECTIVE_METRICS"));
record("Reuses compareSnapshots", compare.includes("compareSnapshots"));

const attribution = read("src/lib/evaluation/attribution.ts");
record("Positive signal classification", attribution.includes("positive_signal"));
record("Negative signal classification", attribution.includes("negative_signal"));
record("Mixed signal classification", attribution.includes("mixed_signal"));
record("Attribution limitations", attribution.includes("correlation"));
record("No causal claim in attribution", attribution.includes("does not prove causation"));

const learningCompare = read("src/lib/learning/compare.ts");
record("Percentage calculations delegated", learningCompare.includes("percentChange"));
record("Zero baseline in learning compare", learningCompare.includes("baseline === 0"));

const service = read("src/lib/evaluation/service.ts");
record("Idempotency on insert", service.includes("23505"));
record("Workspace isolation", service.includes("applyClientWorkspaceScope"));
record("Evaluated-only for strategist list", service.includes('eq("evaluation_status", "evaluated")'));
record("AI entitlement enforced", service.includes("assertEvaluationAiEntitlement"));
record(
  "Usage once on AI success",
  service.includes("await recordUsageEvent") &&
    service.indexOf("await recordUsageEvent") > service.indexOf("interpretEvaluationWithAI")
);
record("No auto execution in evaluation", !service.includes("executeApprovedSteps"));

const prompts = read("src/lib/evaluation/prompts.ts");
record("No causation in AI prompt", prompts.includes("not causation"));
record("No auto execution in AI prompt", prompts.includes("automatic execution"));

const integration = read("src/lib/evaluation/integration.ts");
record("Execution integration queue", integration.includes("queueEvaluationAfterExecution"));
record("Partial execution supported", integration.includes("partially_completed"));

const execute = read("src/lib/execution/execute.ts");
record("Hooks execute for evaluation", execute.includes("queueEvaluationAfterExecution"));

const strategist = read("src/lib/strategist/service.ts");
record("Evaluated outcomes to strategist", strategist.includes("listEvaluatedStrategies"));
record("Non-evaluated excluded in list", strategist.includes("listEvaluatedStrategies"));

const strategistPrompts = read("src/lib/strategist/prompts.ts");
record("Strategy evaluation labeled separately", strategistPrompts.includes("strategyEvaluationsHistorical"));

const tools = read("src/lib/assistant/tools/index.ts");
record("Read-only evaluation tool", tools.includes("get_strategy_evaluation"));
record("Evaluation tool handler", tools.includes("getStrategyEvaluationTool"));

record("Evaluation API strategy", existsSync(resolve(root, "src/app/api/evaluation/strategy/route.ts")));
record("Evaluation API by id", existsSync(resolve(root, "src/app/api/evaluation/[id]/route.ts")));
record("Cron route", existsSync(resolve(root, "src/app/api/cron/strategy-evaluations/route.ts")));

const cron = read("src/app/api/cron/strategy-evaluations/route.ts");
record("Cron authentication", cron.includes("CRON_SECRET"));
record("Cron eligible pending only", cron.includes('eq("evaluation_status", "pending")'));

const vercel = read("vercel.json");
record("Cron scheduled daily", vercel.includes("strategy-evaluations"));

record(
  "Strategy UI panel",
  existsSync(resolve(root, "src/components/assistant/strategy-evaluation-panel.tsx"))
);

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
