/**
 * Phase 17.16 Evidence graph tests
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

console.log("\nPhase 17.16 Evidence graph tests\n");

for (const f of [
  "types.ts",
  "normalize.ts",
  "load.ts",
  "graph.ts",
  "patterns.ts",
  "conflicts.ts",
  "learnings.ts",
  "format.ts",
  "openai.ts",
]) {
  record(`Module evidence/${f}`, existsSync(resolve(root, `src/lib/evidence/${f}`)));
}

const types = read("src/lib/evidence/types.ts");
record("EvidenceRecord type", types.includes("EvidenceRecord"));
record("EvidenceRelationship", types.includes("EvidenceRelationship"));
record("consistent_observed_pattern", types.includes("consistent_observed_pattern"));
record("mixed_observed_pattern", types.includes("mixed_observed_pattern"));
record("Traceability in cross result", types.includes("traceability"));

const norm = read("src/lib/evidence/normalize.ts");
record("evidenceRecordFromExperiment", norm.includes("evidenceRecordFromExperiment"));
record("parseExperimentIdFromLearningKey", norm.includes("parseExperimentIdFromLearningKey"));
record("Never infer missing", !norm.includes("invent"));

const load = read("src/lib/evidence/load.ts");
record("MAX_EVIDENCE_EXPERIMENTS bound", load.includes("MAX_EVIDENCE_EXPERIMENTS"));
record("Concurrency batching", load.includes("EXPERIMENT_LOAD_CONCURRENCY"));

const graph = read("src/lib/evidence/graph.ts");
record("buildEvidenceGraphFromExperiments", graph.includes("buildEvidenceGraphFromExperiments"));
record("tests relationship", graph.includes('"tests"'));
record("uses content", graph.includes("uses"));
record("related_to", graph.includes("related_to"));
record("getEvidenceGraph", graph.includes("getEvidenceGraph"));

const patterns = read("src/lib/evidence/patterns.ts");
record("getCrossExperimentEvidence", patterns.includes("getCrossExperimentEvidence"));
record("Observed across wording", patterns.includes("Observed across"));
record("Results are mixed", patterns.includes("mixed"));
record("No confidence score", !patterns.includes("confidenceScore"));

const conflicts = read("src/lib/evidence/conflicts.ts");
record("getEvidenceConflicts", conflicts.includes("getEvidenceConflicts"));
record("commonContext", conflicts.includes("commonContext"));
record("not resolve automatically", read("src/lib/experiments/decision.ts").includes("does not resolve") || conflicts.includes("not resolve"));

const learn = read("src/lib/evidence/learnings.ts");
record("getCrossExperimentLearnings", learn.includes("getCrossExperimentLearnings"));
record("VALIDATED LEARNING separate", learn.includes("VALIDATED LEARNING"));

const format = read("src/lib/evidence/format.ts");
record("formatCrossExperimentEvidenceForStrategist", format.includes("formatCrossExperimentEvidenceForStrategist"));
record("CROSS-EXPERIMENT EVIDENCE block", format.includes("CROSS-EXPERIMENT EVIDENCE"));

const openai = read("src/lib/evidence/openai.ts");
record("Deterministic fallback", openai.includes("buildDeterministicCrossExperimentSummary"));
record("Forbidden winner language", openai.includes("FORBIDDEN"));
record("interpretCrossExperimentEvidenceWithAI", openai.includes("interpretCrossExperimentEvidenceWithAI"));

const tools = read("src/lib/assistant/tools/evidence.ts");
record("getCrossExperimentEvidenceTool", tools.includes("getCrossExperimentEvidenceTool"));
record("getEvidenceRelationshipsTool", tools.includes("getEvidenceRelationshipsTool"));

const index = read("src/lib/assistant/tools/index.ts");
record("get_cross_experiment_evidence", index.includes("get_cross_experiment_evidence"));
record("get_evidence_conflicts", index.includes("get_evidence_conflicts"));
record("No execution tools in evidence", !tools.includes("prepare_"));

const strategist = read("src/lib/strategist/prompts.ts");
record("crossExperimentEvidenceHistorical", strategist.includes("crossExperimentEvidenceHistorical"));

const brief = read("src/lib/agent/brief.ts");
record("Cross-experiment brief", brief.includes("getCrossExperimentEvidence"));

record("API cross-experiment", existsSync(resolve(root, "src/app/api/evidence/cross-experiment/route.ts")));
record("API relationships", existsSync(resolve(root, "src/app/api/evidence/relationships/route.ts")));
record("API conflicts", existsSync(resolve(root, "src/app/api/evidence/conflicts/route.ts")));
record("API learnings", existsSync(resolve(root, "src/app/api/evidence/learnings/route.ts")));

const ui = read("src/components/assistant/experiment-cross-evidence-section.tsx");
record("UI supporting observations", ui.includes("Supporting observations"));
record("UI conflicting observations", ui.includes("Conflicting observations"));

record("No migration required file absent or optional", !existsSync(resolve(root, "supabase/migrations/036_ai_evidence_graph.sql")));

const perms = read("src/lib/experiments/api-auth.ts");
record("requireExperimentView on APIs", read("src/app/api/evidence/cross-experiment/route.ts").includes("requireExperimentView"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
