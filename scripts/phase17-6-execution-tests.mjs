/**
 * Phase 17.6 Agentic Campaign Execution tests
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("\nPhase 17.6 Execution tests\n");

record("Migration 028", existsSync(resolve(root, "supabase/migrations/028_ai_execution_plans.sql")));
const migration = read("supabase/migrations/028_ai_execution_plans.sql");
record("Table ai_execution_plans", migration.includes("ai_execution_plans"));
record("RLS enabled", migration.includes("enable row level security"));

for (const f of [
  "src/lib/execution/types.ts",
  "src/lib/execution/plan-builder.ts",
  "src/lib/execution/prepare.ts",
  "src/lib/execution/execute.ts",
  "src/lib/execution/orchestrate.ts",
]) {
  record(`Module ${f.split("/").pop()}`, existsSync(resolve(root, f)));
}

const tools = read("src/lib/assistant/tools/index.ts");
record("Tool create_execution_plan", tools.includes('name: "create_execution_plan"'));

const execute = read("src/lib/execution/execute.ts");
record("Expiration check", execute.includes("isPlanExpired"));
record(
  "Content verification",
  read("src/lib/execution/validate-state.ts").includes("verifyContentInWorkspace")
);
record("No publish in execute import", !execute.includes("publishNow"));

const prepare = read("src/lib/execution/prepare.ts");
record("Uses generateContentWithAI", prepare.includes("generateContentWithAI"));
record("Campaign draft status", prepare.includes('status: "draft"'));

record("POST execution plan API", existsSync(resolve(root, "src/app/api/execution/plan/route.ts")));
record("Plan by id API", existsSync(resolve(root, "src/app/api/execution/plan/[id]/route.ts")));
record("Execution UI page", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/execution/[id]/page.tsx")));

const validation = read("src/lib/execution/validation.ts");
record("Step patch validation", validation.includes("applyStepPatches"));
record("Blocks secrets in input", validation.includes("secret"));

const builder = read("src/lib/execution/plan-builder.ts");
record("Brand Brain in builder", builder.includes("loadBrandBrainContext"));
record("Prepare support check", builder.includes("recommendationSupportsPrepare"));

const briefUi = read("src/components/assistant/growth-brief-detail.tsx");
record("Growth brief Prepare button", briefUi.includes("PrepareExecutionButton"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
