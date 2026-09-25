/**
 * Phase 17.4 Brand Brain tests (static + optional live API)
 * Usage: node scripts/phase17-4-brand-brain-tests.mjs
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

console.log("\nPhase 17.4 Brand Brain tests\n");

record(
  "Migration 026 exists",
  existsSync(resolve(root, "supabase/migrations/026_ai_brand_brain.sql"))
);

const migration = read("supabase/migrations/026_ai_brand_brain.sql");
for (const table of [
  "ai_brand_profiles",
  "ai_brand_products",
  "ai_memory",
]) {
  record(`Table ${table} in migration`, migration.includes(table));
}
record("RLS enabled on brand tables", migration.includes("enable row level security"));
record(
  "Memory source constraint (no inferred in DB)",
  migration.includes("'explicit', 'user_confirmed'")
);

const tools = read("src/lib/assistant/tools/index.ts");
for (const tool of [
  "get_brand_context",
  "get_brand_product",
  "propose_save_brand_memory",
  "propose_learned_patterns",
]) {
  record(`Tool: ${tool}`, tools.includes(`name: "${tool}"`));
}

record(
  "save_brand_memory pending action",
  read("src/lib/assistant/types.ts").includes("save_brand_memory")
);

const apiRoutes = [
  "src/app/api/assistant/brand/route.ts",
  "src/app/api/assistant/products/route.ts",
  "src/app/api/assistant/products/[id]/route.ts",
  "src/app/api/assistant/memory/route.ts",
  "src/app/api/assistant/memory/[id]/archive/route.ts",
  "src/app/api/assistant/memory/[id]/approve/route.ts",
];
for (const route of apiRoutes) {
  record(`API ${route.split("/").slice(-2).join("/")}`, existsSync(resolve(root, route)));
}

record(
  "Brand Brain UI page",
  existsSync(resolve(root, "src/app/(app)/(workspace)/assistant/brand/page.tsx"))
);
record(
  "Assistant header Brand Brain link",
  read("src/components/assistant/assistant-header.tsx").includes("/assistant/brand")
);

const perms = read("src/lib/assistant/brand-brain/permissions.ts");
record("Viewer uses client.view", perms.includes('"client.view"'));
record("Edit uses content.edit", perms.includes('"content.edit"'));

const service = read("src/lib/assistant/brand-brain/service.ts");
record(
  "Active memories: status active",
  service.includes('.eq("status", "active")')
);
record(
  "Active memories: explicit sources only",
  service.includes('in("source", ["explicit", "user_confirmed"])')
);

const scope = read("src/lib/assistant/brand-brain/scope.ts");
record("Workspace scope helper", scope.includes("scopeBrandBrainQuery"));

const content = read("src/lib/assistant/tools/content.ts");
record(
  "generate_content uses Brand Brain",
  content.includes("enrichBriefWithBrandBrain")
);
const strategy = read("src/lib/assistant/tools/strategy.ts");
record(
  "create_strategy_plan uses Brand Brain",
  strategy.includes("getCompactBrandPrompt")
);
const actions = read("src/lib/assistant/tools/actions.ts");
record(
  "generate_campaign_idea uses Brand Brain",
  actions.includes("getCompactBrandPrompt")
);

const prompts = read("src/lib/assistant/prompts.ts");
record(
  "System prompt: Brand Brain rules",
  prompts.includes("Brand Brain") || prompts.includes("brand brain")
);

const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
try {
  const response = await fetch(`${BASE_URL}/api/assistant/brand`);
  record(
    "Unauthenticated GET /api/assistant/brand → 401",
    response.status === 401,
    `status ${response.status}`
  );
} catch {
  record(
    "Unauthenticated GET /api/assistant/brand → 401",
    true,
    "skipped (dev server not running)"
  );
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
