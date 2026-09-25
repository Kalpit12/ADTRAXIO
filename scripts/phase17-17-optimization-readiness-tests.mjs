/**
 * Phase 17.17 Optimization readiness & safety gate tests
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

console.log("\nPhase 17.17 Optimization readiness tests\n");

record("Migration 036 file", existsSync(resolve(root, "supabase/migrations/036_ai_optimization_readiness.sql")));
const mig = read("supabase/migrations/036_ai_optimization_readiness.sql");
record("Table ai_optimization_proposals", mig.includes("ai_optimization_proposals"));
record("Status check constraint", mig.includes("'rolled_back'"));
record("RLS enabled", mig.includes("enable row level security"));
record("Idempotency unique", mig.includes("idempotency_key"));

for (const f of [
  "types.ts",
  "constants.ts",
  "eligibility.ts",
  "simulation.ts",
  "risk.ts",
  "stale.ts",
  "validation.ts",
  "permissions.ts",
  "api-auth.ts",
  "service.ts",
  "strategist.ts",
]) {
  record(`Module optimization/${f}`, existsSync(resolve(root, `src/lib/optimization/${f}`)));
}

const types = read("src/lib/optimization/types.ts");
record("Proposal statuses draft/review/approved", types.includes('"review"') && types.includes('"approved"'));
record("EligibilityStatus eligible", types.includes("insufficient_evidence"));
record("OptimizationOpportunity type", types.includes("OptimizationOpportunity"));
record("RollbackMetadata", types.includes("RollbackMetadata"));
record("OptimizationAuditEntry", types.includes("OptimizationAuditEntry"));

const constants = read("src/lib/optimization/constants.ts");
record("TTL 24h documented", constants.includes("OPTIMIZATION_PROPOSAL_TTL_HOURS = 24"));
record("MIN_COMPLETED_EXPERIMENTS", constants.includes("MIN_COMPLETED_EXPERIMENTS_FOR_ALLOCATION"));
record("MAX_EVIDENCE_AGE_DAYS", constants.includes("MAX_EVIDENCE_AGE_DAYS"));
record("SUPPORTED_PROPOSAL_TYPES", constants.includes("allocation_change"));

const elig = read("src/lib/optimization/eligibility.ts");
record("evaluateOptimizationEligibility", elig.includes("evaluateOptimizationEligibility"));
record("conflicting_evidence path", elig.includes("conflicting_evidence"));
record("stale_evidence path", elig.includes("stale_evidence"));
record("No confidence score", !elig.includes("confidenceScore"));

const sim = read("src/lib/optimization/simulation.ts");
record("buildSimulationPreview", sim.includes("buildSimulationPreview"));
record("Projected allocation wording", sim.includes("Projected allocation"));
record("Not a performance forecast", sim.includes("not a performance forecast"));

const risk = read("src/lib/optimization/risk.ts");
record("assessOptimizationRisk", risk.includes("assessOptimizationRisk"));
record("Risk levels low/medium/high/blocked", risk.includes('"blocked"'));
record("No numeric risk score export", !risk.includes("riskScore"));

const stale = read("src/lib/optimization/stale.ts");
record("verifyProposalFreshness", stale.includes("verifyProposalFreshness"));

const validation = read("src/lib/optimization/validation.ts");
record("assertSupportedProposalType", validation.includes("assertSupportedProposalType"));
record("Reject unsupported types", validation.includes("Unsupported proposal type"));

const service = read("src/lib/optimization/service.ts");
record("prepareOptimizationProposal draft only", service.includes('newStatus: "draft"'));
record("approve revalidates eligibility", service.includes("evaluateOptimizationEligibility"));
record("approve stale blocked", service.includes("verifyProposalFreshness"));
record("rollback metadata on approve", service.includes("rollback_state_json"));
record("No executed status in approve", !service.includes('status: "executed"'));
record("expireOptimizationProposals", service.includes("expireOptimizationProposals"));

const perms = read("src/lib/optimization/permissions.ts");
record("assertOptimizationView", perms.includes("assertOptimizationView"));
record("assertOptimizationApprove", perms.includes("assertOptimizationApprove"));

const tools = read("src/lib/assistant/tools/optimization.ts");
record("getOptimizationProposalsTool", tools.includes("getOptimizationProposalsTool"));
record("prepareOptimizationProposalTool draft", tools.includes("prepareOptimizationProposalTool"));
record("Assistant cannot approve", tools.includes("cannot approve"));

const index = read("src/lib/assistant/tools/index.ts");
record("Tool get_optimization_proposals", index.includes("get_optimization_proposals"));
record("Tool prepare_optimization_proposal", index.includes("prepare_optimization_proposal"));
record("Tool preview_optimization", index.includes("preview_optimization"));
record("Tool get_optimization_eligibility", index.includes("get_optimization_eligibility"));

record("API proposals route", existsSync(resolve(root, "src/app/api/optimization/proposals/route.ts")));
record("API approve route", existsSync(resolve(root, "src/app/api/optimization/proposals/[id]/approve/route.ts")));
record("API cron optimization-readiness", existsSync(resolve(root, "src/app/api/cron/optimization-readiness/route.ts")));

const cron = read("src/app/api/cron/optimization-readiness/route.ts");
record("Cron expires only", cron.includes("expireOptimizationProposals"));
record("Cron no approve", !cron.includes("approveOptimization"));

const strategist = read("src/lib/optimization/strategist.ts");
record("listOptimizationOpportunities", strategist.includes("listOptimizationOpportunities"));
record("not executeOptimization", strategist.includes("not executeOptimization"));

const stratSvc = read("src/lib/strategist/service.ts");
record("Strategist optimizationOpportunities", stratSvc.includes("optimizationOpportunities"));

const brief = read("src/lib/agent/brief.ts");
record("Growth brief optimization mention", brief.includes("optimization opportunity is available for review"));

record("UI optimization list page", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/optimization/page.tsx")));
record("UI optimization detail page", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/optimization/[id]/page.tsx")));
const detailUi = read("src/components/assistant/optimization-detail-view.tsx");
record("UI execute requires confirmation", detailUi.includes("Confirm apply"));
record("UI execution or rollback controls", detailUi.includes("Execute approved change") || detailUi.includes("Rollback"));

record("verify-migration-036 script", existsSync(resolve(root, "scripts/verify-migration-036.mjs")));
record("package test:optimization-readiness", read("package.json").includes("test:optimization-readiness"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
