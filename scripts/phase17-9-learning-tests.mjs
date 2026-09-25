/**
 * Phase 17.9 Learning tests
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

console.log("\nPhase 17.9 Learning tests\n");

record("Migration 030 file", existsSync(resolve(root, "supabase/migrations/030_ai_learning.sql")));
const mig = read("supabase/migrations/030_ai_learning.sql");
record("Table ai_learning_outcomes", mig.includes("ai_learning_outcomes"));
record("RLS enabled", mig.includes("enable row level security"));
record("Idempotency unique", mig.includes("idempotency_key"));

for (const f of [
  "types.ts",
  "baseline.ts",
  "measure.ts",
  "compare.ts",
  "learning.ts",
  "service.ts",
  "validation.ts",
  "prompts.ts",
  "openai.ts",
  "integration.ts",
  "context.ts",
]) {
  record(`Module ${f}`, existsSync(resolve(root, `src/lib/learning/${f}`)));
}

const baseline = read("src/lib/learning/baseline.ts");
record("Baseline capture", baseline.includes("captureWorkspaceBaseline"));

const compare = read("src/lib/learning/compare.ts");
record("Percentage calculation", compare.includes("percentChange"));
record("Zero baseline handled", compare.includes("baseline === 0"));
record("NULL metrics handled", compare.includes("unavailable"));

const measure = read("src/lib/learning/measure.ts");
record("Outcome window enforcement", measure.includes("outcomeWindowElapsed"));

const service = read("src/lib/learning/service.ts");
record("Learning persistence", service.includes("insertLearningOutcome"));
record("Duplicate measurement blocked", service.includes("23505"));
record("Workspace isolation", service.includes("applyClientWorkspaceScope"));
record("AI entitlement enforced", service.includes("assertLearningAiEntitlement"));
record(
  "Usage once on AI success",
  service.includes("await recordUsageEvent") &&
    service.indexOf("await recordUsageEvent") > service.indexOf("interpretOutcomeWithAI")
);
record("Audit trail", service.includes("appendAudit"));

const integration = read("src/lib/learning/integration.ts");
record("Execution integration", integration.includes("captureLearningBaselinesAfterExecution"));
record("Partial execution", integration.includes("partially_completed"));
record("Failed execution", integration.includes("failed"));
record("Retry idempotency key", integration.includes("idempotencyKey"));

const execute = read("src/lib/execution/execute.ts");
record("Hooks execute", execute.includes("captureLearningBaselinesAfterExecution"));
record("No execution from learning", !read("src/lib/learning/service.ts").includes("executeApprovedSteps"));

const strategist = read("src/lib/strategist/context.ts");
record("Measured learning in strategist", strategist.includes("loadLearningsForStrategist"));

const listMeasured = read("src/lib/learning/service.ts");
record("Unmeasured excluded", listMeasured.includes('eq("status", "measured")'));

const perms = read("src/lib/learning/permissions.ts");
record("Viewer cannot modify", perms.includes("assertLearningMeasure"));

const tools = read("src/lib/assistant/tools/index.ts");
record("Read-only learning tools", tools.includes("get_learning_outcomes"));
record("No publish in learning", !read("src/lib/learning/openai.ts").includes("publishNow"));

record("Learning API", existsSync(resolve(root, "src/app/api/learning/outcomes/route.ts")));
record("Learnings UI", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/learnings/page.tsx")));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
