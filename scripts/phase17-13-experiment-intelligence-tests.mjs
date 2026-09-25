/**
 * Phase 17.13 Experiment intelligence tests
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

console.log("\nPhase 17.13 Experiment intelligence tests\n");

record("Migration 033", existsSync(resolve(root, "supabase/migrations/033_ai_experiment_intelligence.sql")));
const mig = read("supabase/migrations/033_ai_experiment_intelligence.sql");
record("readiness_status column", mig.includes("readiness_status"));
record("evidence_quality column", mig.includes("evidence_quality"));
record("No duplicate success_metric", !mig.includes("primary_metric"));

for (const f of ["health.ts", "evidence.ts", "relationships.ts", "intelligence.ts", "summaries.ts", "decision.ts", "history.ts"]) {
  record(`Module ${f}`, existsSync(resolve(root, `src/lib/experiments/${f}`)));
}

const health = read("src/lib/experiments/health.ts");
record("Health evaluation", health.includes("evaluateExperimentHealth"));
record("Health blockers", health.includes("blockers"));

const evidence = read("src/lib/experiments/evidence.ts");
record("Evidence quality levels", evidence.includes("insufficient"));
record("No numeric AI score", !evidence.includes("confidenceScore"));

const comparison = read("src/lib/experiments/comparison.ts");
record("higher_observed_result", comparison.includes("higher_observed_result"));
record("No winner language", !comparison.includes('"winner"'));
record("Relative difference", comparison.includes("relativeDifference"));

const relationships = read("src/lib/experiments/relationships.ts");
record("Related experiments", relationships.includes("findRelatedExperiments"));
record("Workspace via history query", relationships.includes("queryExperimentHistory"));

const decision = read("src/lib/experiments/decision.ts");
record("Conflict detection", decision.includes("mixed observed results"));

const intelligence = read("src/lib/experiments/intelligence.ts");
record("getExperimentIntelligence", intelligence.includes("getExperimentIntelligence"));
record("listExperimentHistory", intelligence.includes("listExperimentHistory"));
record("sync idempotent status", intelligence.includes('interpretation_status'));
record("No auto start in cron file", !intelligence.includes("startExperiment"));

const summaries = read("src/lib/experiments/summaries.ts");
record("Experiment summary builder", summaries.includes("buildExperimentSummary"));
record("Deterministic fallback", summaries.includes("buildDeterministicIntelligenceInterpretation"));

const service = read("src/lib/experiments/service.ts");
record("Learning idempotency preserved", service.includes("experiment:${experimentId}:variant"));
record("Sync after measure", service.includes("syncExperimentIntelligence"));

const prompts = read("src/lib/experiments/prompts.ts");
record("No causation in AI prompt", prompts.includes("Never fabricate"));
record("No auto optimize prompt", prompts.includes("automatic optimization"));

const strategist = read("src/lib/strategist/prompts.ts");
record("Experiment evidence separate", strategist.includes("experimentEvidenceHistorical"));

const tools = read("src/lib/assistant/tools/index.ts");
record("get_experiment_intelligence tool", tools.includes("get_experiment_intelligence"));
record("get_experiment_history tool", tools.includes("get_experiment_history"));
record("No optimization tool", !tools.includes("optimize_experiment"));

record("Intelligence API", existsSync(resolve(root, "src/app/api/experiments/[id]/intelligence/route.ts")));
record("History API", existsSync(resolve(root, "src/app/api/experiments/intelligence/history/route.ts")));
record("Cron intelligence", existsSync(resolve(root, "src/app/api/cron/experiment-intelligence/route.ts")));

const cron = read("src/app/api/cron/experiment-intelligence/route.ts");
record("Cron CRON_SECRET", cron.includes("CRON_SECRET"));
record("Cron no publish", !cron.includes("publishNow"));

record("History UI", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/experiments/history/page.tsx")));
record("Intelligence UI sections", existsSync(resolve(root, "src/components/assistant/experiment-intelligence-sections.tsx")));

const brief = read("src/lib/agent/brief.ts");
record("Growth brief experiment ref", brief.includes("formatExperimentEvidenceForBrief"));

const perms = read("src/lib/experiments/permissions.ts");
record("Permission helpers", perms.includes("assertExperimentView"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
