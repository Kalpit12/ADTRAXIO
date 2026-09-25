/**
 * Phase 17.15 Experiment evaluation tests
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

console.log("\nPhase 17.15 Experiment evaluation tests\n");

record("Migration 035", existsSync(resolve(root, "supabase/migrations/035_ai_experiment_evaluation.sql")));
const mig = read("supabase/migrations/035_ai_experiment_evaluation.sql");
record("experiment_evaluation_json column", mig.includes("experiment_evaluation_json"));

const expMod = read("src/lib/evaluation/experiment.ts");
record("variantComparisonFromMeasurementSnapshot", expMod.includes("variantComparisonFromMeasurementSnapshot"));
record("variantComparisonToComparisonJson", expMod.includes("variantComparisonToComparisonJson"));
record("buildNormalizedExperimentEvaluation", expMod.includes("buildNormalizedExperimentEvaluation"));
record("Snapshot authoritative comment", expMod.includes("authoritative"));
record("No winner in module", !expMod.includes('"winner"'));
record("experimentEvaluationIdempotencyKey", expMod.includes("experimentEvaluationIdempotencyKey"));
record("higher_observed classifications", expMod.includes("NormalizedVariantEvaluationRow"));
record("attributionFromMeasurementSnapshot", expMod.includes("attributionFromMeasurementSnapshot"));

const run = read("src/lib/evaluation/experiment-run.ts");
record("runExperimentEvaluation", run.includes("runExperimentEvaluation"));
record("Idempotent snapshot key", run.includes("snapshotIdempotencyKey"));
record("Incomplete without snapshot", run.includes("No measurement snapshot"));
record("Learning gate integration", run.includes("gateExperimentLearning"));
record("Strategy eval sync", run.includes("syncStrategyEvaluationFromSnapshot"));
record("listExperimentEvaluationDocuments", run.includes("listExperimentEvaluationDocuments"));

const service = read("src/lib/evaluation/service.ts");
record("Experiment idempotency queue", service.includes("experimentEvaluationIdempotencyKey"));
record("23505 returns existing", service.includes("23505"));
record("runStrategyEvaluation experiment branch", service.includes("runExperimentEvaluation"));

const openai = read("src/lib/evaluation/openai.ts");
record("interpretExperimentEvaluationWithAI", openai.includes("interpretExperimentEvaluationWithAI"));

const prompts = read("src/lib/evaluation/prompts.ts");
record("Experiment eval system prompt", prompts.includes("buildExperimentEvaluationSystemPrompt"));
record("No statistical significance prompt", prompts.includes("statistical significance"));

const validation = read("src/lib/evaluation/validation.ts");
record("validateExperimentEvaluationInterpretation", validation.includes("validateExperimentEvaluationInterpretation"));
record("Forbidden winner language", validation.includes("Forbidden evaluation language"));

const ctx = read("src/lib/evaluation/context.ts");
record("formatExperimentEvaluationsForStrategist", ctx.includes("formatExperimentEvaluationsForStrategist"));
record("EXPERIMENT EVALUATION block", ctx.includes("EXPERIMENT EVALUATION"));

const strategist = read("src/lib/strategist/prompts.ts");
record("experimentEvaluationsHistorical", strategist.includes("experimentEvaluationsHistorical"));

const expService = read("src/lib/experiments/service.ts");
record("runExperimentEvaluation on measure", expService.includes("runExperimentEvaluation"));
record("Comparison from snapshot", expService.includes("variantComparisonFromMeasurementSnapshot"));

const tools = read("src/lib/assistant/tools/index.ts");
record("get_experiment_evaluation tool", tools.includes("get_experiment_evaluation"));

record("Evaluation API route", existsSync(resolve(root, "src/app/api/experiments/[id]/evaluation/route.ts")));
record("Evaluation UI section", existsSync(resolve(root, "src/components/assistant/experiment-evaluation-section.tsx")));

const ui = read("src/components/assistant/experiment-evaluation-section.tsx");
record("UI lifecycle label", ui.includes("Lifecycle"));
record("UI attribution", ui.includes("Attribution"));

const learning = read("src/lib/experiments/learning-quality.ts");
record("Learning gate export", learning.includes("gateExperimentLearning"));

const measureRoute = read("src/app/api/experiments/[id]/measure/route.ts");
record("Measure route exists", measureRoute.includes("measureRunningExperiment"));

const intel = read("src/lib/experiments/intelligence.ts");
record("No auto optimize in intelligence", !intel.includes("optimizeAllocation"));

record("verify:migration-035 script", existsSync(resolve(root, "scripts/verify-migration-035.mjs")));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
