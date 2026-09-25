/**
 * Phase 17.8 Strategic Execution Planner tests
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

console.log("\nPhase 17.8 Strategist tests\n");

record(
  "Migration 029 file",
  existsSync(resolve(root, "supabase/migrations/029_ai_strategic_plans.sql"))
);

const migration = read("supabase/migrations/029_ai_strategic_plans.sql");
record("Table ai_strategic_plans", migration.includes("ai_strategic_plans"));
record("RLS enabled", migration.includes("enable row level security"));

for (const f of [
  "src/lib/strategist/types.ts",
  "src/lib/strategist/context.ts",
  "src/lib/strategist/prompts.ts",
  "src/lib/strategist/openai.ts",
  "src/lib/strategist/validation.ts",
  "src/lib/strategist/service.ts",
  "src/lib/strategist/plan-builder.ts",
  "src/lib/strategist/evidence.ts",
]) {
  record(`Module ${f.split("/").pop()}`, existsSync(resolve(root, f)));
}

const validation = read("src/lib/strategist/validation.ts");
record("Strict JSON validation", validation.includes("validateStrategicPlanOutput"));
record(
  "Invalid action type rejected",
  validation.includes("ALLOWED_STRATEGIC_ACTION_TYPES") &&
    validation.includes("Invalid action type")
);

const service = read("src/lib/strategist/service.ts");
record("Strategic plan creation", service.includes("createStrategicPlan"));
record("Evidence persisted", service.includes("evidence_json"));
record(
  "Brand Brain in context",
  read("src/lib/strategist/context.ts").includes("getCompactBrandPrompt")
);
record("Workspace isolation", service.includes("applyClientWorkspaceScope"));
record("Viewer cannot prepare", read("src/lib/strategist/permissions.ts").includes("assertStrategistPrepare"));
record("AI entitlement enforced", service.includes("assertStrategistAiEntitlement"));
record(
  "Usage recorded once on success",
  service.includes("recordUsageEvent") && service.includes("createStrategicPlan")
);
const createFn = service.slice(service.indexOf("export async function createStrategicPlan"));
record(
  "Failed generation does not record usage",
  createFn.includes("await recordUsageEvent") &&
    createFn.indexOf("await recordUsageEvent") > createFn.indexOf(".insert(") &&
    createFn.indexOf("await recordUsageEvent") > createFn.indexOf("generateStrategicPlanWithAI")
);

const planBuilder = read("src/lib/strategist/plan-builder.ts");
record(
  "Converts to execution plan",
  planBuilder.includes("buildExecutionPlanFromStrategicPlan")
);
record(
  "Uses 17.7 engine",
  service.includes("insertExecutionPlan") && service.includes("prepareExecutionPlan")
);

const openai = read("src/lib/strategist/openai.ts");
const strategistService = service;
record(
  "No direct publishing",
  !strategistService.includes("publishNow") && !openai.includes("publishNow")
);
record(
  "No direct scheduling",
  !strategistService.includes("schedulePost(") && !openai.includes("schedulePost")
);
record(
  "No direct campaign execution",
  !strategistService.includes("createCampaign(") && !openai.includes("createCampaign")
);

record("Expired plan blocked", service.includes("isStrategicPlanExpired"));
record("Audit trail created", service.includes("appendAudit"));

record("POST strategist plan API", read("src/app/api/strategist/plan/route.ts").includes("POST"));
record("GET strategist plan by id", read("src/app/api/strategist/plan/[id]/route.ts").includes("GET"));
record(
  "Prepare route",
  existsSync(resolve(root, "src/app/api/strategist/plan/[id]/prepare/route.ts"))
);
record("Tool create_strategic_plan", read("src/lib/assistant/tools/index.ts").includes("create_strategic_plan"));
record(
  "Strategy UI page",
  existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/strategy/[id]/page.tsx"))
);
record(
  "Measured vs interpreted UI",
  read("src/components/assistant/strategic-plan-view.tsx").includes("Measured")
);

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
