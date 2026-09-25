/**
 * Phase 17.10 Adaptive Strategy tests
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

console.log("\nPhase 17.10 Adaptive Strategy tests\n");

const relevance = read("src/lib/learning/relevance.ts");
const service = read("src/lib/learning/service.ts");
const strategist = read("src/lib/strategist/service.ts");

record("getRelevantLearnings", relevance.includes("export async function getRelevantLearnings"));
record("Measured only", service.includes('eq("status", "measured")'));
record("Pending excluded", service.includes('"measured"') && !relevance.includes("pending"));
record("Workspace isolation", service.includes("applyClientWorkspaceScope"));
record("Recency classification", relevance.includes("classifyRecency"));
record("Sample size handling", relevance.includes("classifySampleStrength"));
record("Platform relevance", relevance.includes("platformMatch"));
record("Objective relevance", relevance.includes("objectiveOverlap"));
record("Conflicting learning hint", relevance.includes("detectMixedEvidence"));
record("Adaptation builder", existsSync(resolve(root, "src/lib/strategist/adaptive.ts")));
record("Learning IDs persisted", strategist.includes("learningIds"));
record("Adaptive block in plan_json", strategist.includes("adaptive"));
record("No fabricated when empty", relevance.includes("No validated historical learnings"));
record("Strategist with learnings", strategist.includes("getRelevantLearnings"));
record("Viewer permissions", read("src/lib/strategist/permissions.ts").includes("assertStrategistEdit"));
record("Assistant adaptive message", read("src/lib/assistant/tools/strategic-planner.ts").includes("learningCount"));
record("No execution from adaptive", !read("src/lib/strategist/adaptive.ts").includes("executeApprovedSteps"));
record("AI entitlement", strategist.includes("assertStrategistAiEntitlement"));
const createFn = strategist.slice(strategist.indexOf("export async function createStrategicPlan"));
record(
  "Usage once on success",
  createFn.indexOf("recordUsageEvent") > createFn.indexOf("generateStrategicPlanWithAI")
);
record(
  "Failed AI no usage in catch",
  !createFn.includes("catch") || !/catch[\s\S]*recordUsageEvent/.test(createFn)
);
record("API metadata", read("src/app/api/strategist/plan/route.ts").includes("learningCount"));
record("Adaptive UI", read("src/components/assistant/strategic-plan-view.tsx").includes("Adaptive insights"));
record("Adaptive prompts", read("src/lib/strategist/prompts.ts").includes("HISTORICAL"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
