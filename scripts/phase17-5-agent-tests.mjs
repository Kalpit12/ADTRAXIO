/**
 * Phase 17.5 Proactive Growth Agent tests
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

console.log("\nPhase 17.5 Growth Agent tests\n");

record("Migration 027 exists", existsSync(resolve(root, "supabase/migrations/027_ai_growth_briefs.sql")));
const migration = read("supabase/migrations/027_ai_growth_briefs.sql");
record("Table ai_growth_briefs", migration.includes("ai_growth_briefs"));
record("RLS on growth briefs", migration.includes("enable row level security"));

for (const file of [
  "src/lib/agent/types.ts",
  "src/lib/agent/context.ts",
  "src/lib/agent/analysis.ts",
  "src/lib/agent/brief.ts",
  "src/lib/agent/actions.ts",
]) {
  record(`Agent module: ${file.split("/").pop()}`, existsSync(resolve(root, file)));
}

const analysis = read("src/lib/agent/analysis.ts");
record("Deterministic minimal brief", analysis.includes("buildMinimalBrief"));
record("Meaningful change path", analysis.includes("hasMeaningfulChange"));

const brief = read("src/lib/agent/brief.ts");
record("Duplicate prevention", brief.includes("findExistingBrief"));

const validation = read("src/lib/agent/validation.ts");
record("AI schema validation", validation.includes("validateBriefOutput"));

const openai = read("src/lib/agent/openai.ts");
record("AI only after facts", openai.includes("STRUCTURED FACTS"));

const actions = read("src/lib/agent/actions.ts");
record("No auto publish in actions", !actions.includes("publish_post"));
for (const action of [
  "create_content",
  "create_strategy",
  "review_scheduled_posts",
  "repurpose_content",
]) {
  record(`Action type: ${action}`, actions.includes(action));
}

record("GET brief API", existsSync(resolve(root, "src/app/api/agent/brief/route.ts")));
record("POST brief API", read("src/app/api/agent/brief/route.ts").includes("export async function POST"));
record("Cron growth-briefs", existsSync(resolve(root, "src/app/api/cron/growth-briefs/route.ts")));

record("Briefs UI page", existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/briefs/page.tsx")));
record("Dashboard growth card", existsSync(resolve(root, "src/components/dashboard/growth-brief-card.tsx")));

const home = read("src/lib/assistant/home-insights.ts");
record("Assistant home integrates brief", home.includes("getLatestGrowthBrief"));

const notify = read("src/lib/agent/notify.ts");
record("Notification gating", notify.includes("attentionInsights"));

const context = read("src/lib/agent/context.ts");
record("Brand Brain in context", context.includes("loadBrandBrainContext"));
record("Insufficient data gaps", context.includes("dataGaps"));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
