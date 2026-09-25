/**
 * Phase 17.12 Controlled experimentation tests
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

console.log("\nPhase 17.12 Experiment tests\n");

record("Migration 032 file", existsSync(resolve(root, "supabase/migrations/032_ai_experiments.sql")));
const mig = read("supabase/migrations/032_ai_experiments.sql");
record("Table ai_experiments", mig.includes("ai_experiments"));
record("Table ai_experiment_variants", mig.includes("ai_experiment_variants"));
record("RLS enabled", mig.includes("enable row level security"));
record("Variant key unique", mig.includes("unique (experiment_id, variant_key)"));
record("Learning experiment columns", mig.includes("experiment_id"));
record("Fixed split allocation type", mig.includes("fixed_split"));

for (const f of [
  "types.ts",
  "context.ts",
  "validation.ts",
  "service.ts",
  "allocation.ts",
  "metrics.ts",
  "comparison.ts",
  "prompts.ts",
  "openai.ts",
  "permissions.ts",
  "api-auth.ts",
]) {
  record(`Module ${f}`, existsSync(resolve(root, `src/lib/experiments/${f}`)));
}

const allocation = read("src/lib/experiments/allocation.ts");
record("Minimum 2 variants", allocation.includes("at least two variants"));
record("Allocation totals 100", allocation.includes("total 100"));

const comparison = read("src/lib/experiments/comparison.ts");
record("compareVariants export", comparison.includes("export function compareVariants"));
record("No statistical significance claim", comparison.includes("No statistical significance"));
record("Higher observed language", comparison.includes("higherObservedVariantKey"));

const service = read("src/lib/experiments/service.ts");
record("Experiment creation", service.includes("createExperimentFromDraft"));
record("Workspace isolation", service.includes("applyClientWorkspaceScope"));
record("Approve flow", service.includes("approveExperiment"));
record("Explicit start", service.includes("startExperiment"));
record("Prepare uses execution plan", service.includes("insertExecutionPlan"));
record("No auto publish", !service.includes("publishNow"));
record("No bandit", !service.includes("bandit"));
record("Learning integration", service.includes("experimentId"));
record("Idempotency learning key", service.includes("experiment:${experimentId}"));
record("Completed for strategist", service.includes("listCompletedExperiments"));
record("AI entitlement", service.includes("assertExperimentAiEntitlement"));
record(
  "Usage once on AI",
  service.includes("await recordUsageEvent") &&
    service.indexOf("interpretExperimentWithAI") < service.indexOf("await recordUsageEvent")
);

const prompts = read("src/lib/experiments/prompts.ts");
record("No auto start in AI prompt", prompts.includes("Never start experiments"));
record("No winner language", prompts.includes("Do not call any variant superior"));

const openai = read("src/lib/experiments/openai.ts");
record("No direct execution in openai", !openai.includes("executeApprovedSteps"));

const perms = read("src/lib/experiments/permissions.ts");
record("Viewer approve blocked via edit", perms.includes("assertExperimentApprove"));

const tools = read("src/lib/assistant/tools/index.ts");
record("get_experiments tool", tools.includes("get_experiments"));
record("create_experiment_draft tool", tools.includes("create_experiment_draft"));
record("prepare_experiment tool", tools.includes("prepare_experiment"));
record("compare tool", tools.includes("compare_experiment_variants"));

const strategist = read("src/lib/strategist/service.ts");
record("Strategist experiment evidence", strategist.includes("listExperimentIntelligenceSummaries"));
record("Incomplete excluded", read("src/lib/experiments/service.ts").includes('status: "completed"'));

record("Experiments API", existsSync(resolve(root, "src/app/api/experiments/route.ts")));
record("Approve API", existsSync(resolve(root, "src/app/api/experiments/[id]/approve/route.ts")));
record("Start API", existsSync(resolve(root, "src/app/api/experiments/[id]/start/route.ts")));
record("Cron route", existsSync(resolve(root, "src/app/api/cron/experiments/route.ts")));

const cron = read("src/app/api/cron/experiments/route.ts");
record("Cron auth", cron.includes("CRON_SECRET"));
record("Cron does not start experiments", !cron.includes("startExperiment"));

record("Experiments UI list", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/experiments/page.tsx")));
record("Experiment detail UI", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/experiments/[id]/page.tsx")));

const vercel = read("vercel.json");
record("Cron scheduled", vercel.includes("/api/cron/experiments"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
