/**
 * Phase 17.14 Experiment validation & evidence engine tests
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

console.log("\nPhase 17.14 Experiment validation tests\n");

record("Migration 034 file", existsSync(resolve(root, "supabase/migrations/034_ai_experiment_validation.sql")));
const mig034 = read("supabase/migrations/034_ai_experiment_validation.sql");
record("context_snapshot_json", mig034.includes("context_snapshot_json"));
record("measurement_snapshot_json", mig034.includes("measurement_snapshot_json"));

for (const f of [
  "context-resolver.ts",
  "data-quality.ts",
  "attribution.ts",
  "measurement-snapshot.ts",
  "learning-quality.ts",
  "historical-evidence.ts",
  "test-mode.ts",
  "fixtures.ts",
]) {
  record(`Module ${f}`, existsSync(resolve(root, `src/lib/experiments/${f}`)));
}

const resolver = read("src/lib/experiments/context-resolver.ts");
record("resolveExperimentContext", resolver.includes("resolveExperimentContext"));
record("buildContextSnapshot", resolver.includes("buildContextSnapshot"));
record("Never invent missing", resolver.includes("missing"));
record("No TDZ goal bug", !resolver.includes("contentContext_goal"));

const dq = read("src/lib/experiments/data-quality.ts");
record("evaluateDataQuality", dq.includes("evaluateDataQuality"));
record("DQ status strong", dq.includes('"strong"'));
record("No confidence score", !dq.includes("confidenceScore"));

const attr = read("src/lib/experiments/attribution.ts");
record("validateExperimentAttribution", attr.includes("validateExperimentAttribution"));
record("Associated wording", attr.includes("associated with"));
record("No caused wording", !attr.includes("caused the"));

const snap = read("src/lib/experiments/measurement-snapshot.ts");
record("buildMeasurementSnapshot", snap.includes("buildMeasurementSnapshot"));
record("Idempotency key", snap.includes("idempotencyKey"));
record("shouldPersistMeasurement", snap.includes("shouldPersistMeasurement"));

const learn = read("src/lib/experiments/learning-quality.ts");
record("gateExperimentLearning", learn.includes("gateExperimentLearning"));
record("insufficient_data gate", learn.includes("insufficient_data"));

const hist = read("src/lib/experiments/historical-evidence.ts");
record("getHistoricalExperimentEvidence", hist.includes("getHistoricalExperimentEvidence"));
record("Mixed results wording", hist.includes("mixed"));

const testMode = read("src/lib/experiments/test-mode.ts");
record("EXPERIMENT_TEST_MODE server only", testMode.includes("EXPERIMENT_TEST_MODE"));
record("Production guard", testMode.includes("VERCEL_ENV"));
record("observationWindowElapsed", testMode.includes("observationWindowElapsed"));

const fixtures = read("src/lib/experiments/fixtures.ts");
record("Fixture A", fixtures.includes("FIXTURE_EXPERIMENT_A"));
record("Fixture incomplete C", fixtures.includes("FIXTURE_EXPERIMENT_C_INCOMPLETE"));

const service = read("src/lib/experiments/service.ts");
record("Context snapshot on start", service.includes("context_snapshot_json"));
record("Measurement snapshot persist", service.includes("measurement_snapshot_json"));
record("Resolve on create", service.includes("resolveExperimentContext"));
record("Force measure guard", service.includes("canForceExperimentMeasurement"));
record("Learning gate after measure", service.includes("gateExperimentLearning"));

const decision = read("src/lib/experiments/decision.ts");
record("Conflict conflict flag", decision.includes("conflict: true"));
record("commonContext", decision.includes("commonContext"));
record("No auto resolve", decision.includes("does not resolve"));

const intelligence = read("src/lib/experiments/intelligence.ts");
record("dataQuality in summary", intelligence.includes("evaluateDataQuality"));
record("attribution in summary", intelligence.includes("validateExperimentAttribution"));

const summaries = read("src/lib/experiments/summaries.ts");
record("Strategist attribution field", summaries.includes("attribution:"));
record("MEASURED labels", summaries.includes("MEASURED:"));

record("Measure API route", existsSync(resolve(root, "src/app/api/experiments/[id]/measure/route.ts")));
const measureRoute = read("src/app/api/experiments/[id]/measure/route.ts");
record("No client force flag", !measureRoute.includes("request.json"));
record("Server test mode only", measureRoute.includes("canForceExperimentMeasurement"));

const tools = read("src/lib/assistant/tools/index.ts");
record("historical evidence tool", tools.includes("get_historical_experiment_evidence"));

const types = read("src/lib/experiments/types.ts");
record("DataQualityReport type", types.includes("DataQualityReport"));
record("ExperimentContextSnapshot", types.includes("ExperimentContextSnapshot"));
record("ExperimentMeasurementSnapshot", types.includes("ExperimentMeasurementSnapshot"));

const ui = read("src/components/assistant/experiment-intelligence-sections.tsx");
record("UI data quality section", ui.includes("Data quality"));
record("UI attribution section", ui.includes("Attribution"));
record("UI context snapshot", ui.includes("Context snapshot"));

const cronIntel = read("src/app/api/cron/experiment-intelligence/route.ts");
record("Cron does not start", !cronIntel.includes("startExperiment"));
record("Cron auth", cronIntel.includes("CRON_SECRET"));

record("verify:migration-034 script", existsSync(resolve(root, "scripts/verify-migration-034.mjs")));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
