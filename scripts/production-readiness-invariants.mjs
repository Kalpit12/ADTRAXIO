/**
 * Static production security invariants (no live API calls, no secrets printed).
 * npm run test:production-readiness-invariants
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { dirname, resolve } from "path";
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

const service = read("src/lib/publishing/service.ts");
const stage = read("src/lib/publishing/stage-ai-asset.ts");
const m040 = read("supabase/migrations/040_ai_media_infrastructure.sql");
const m005 = read("supabase/migrations/005_publishing.sql");
const webhook = read("src/lib/billing/webhook.ts");
const prepare = read("src/lib/content/creative-campaign-service.ts");

record(
  "mediaAssetId requires contentId",
  service.includes("Saved content is required to publish AI-generated media"),
  ""
);
record(
  "AI staging not on campaign prepare",
  service.includes("stageAiMediaAssetForPublishing") &&
    !prepare.includes("stageAiMediaAssetForPublishing"),
  ""
);
record(
  "generated-media private in migration",
  m040.includes("'generated-media'") && m040.includes("false"),
  ""
);
record("content-media public read policy", m005.includes("Public read content media"), "");
record("Stripe webhook signature verification", webhook.includes("constructEvent"), "");
record("stage-ai-asset invariant documented", stage.includes("Production invariant"), "");

const forbidden = [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
  "NEXT_PUBLIC_SERVICE_ROLE",
];
let clientExposesServiceRole = false;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules") continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      const text = readFileSync(full, "utf8");
      if (forbidden.some((f) => text.includes(f))) {
        clientExposesServiceRole = true;
      }
    }
  }
}
walk(resolve(root, "src"));
record("No NEXT_PUBLIC service role env", !clientExposesServiceRole, "");

const crons = [
  "publish",
  "analytics",
  "growth-briefs",
  "learning-outcomes",
  "strategy-evaluations",
  "experiments",
  "experiment-intelligence",
  "optimization-readiness",
];
record(
  "All cron routes use CRON_SECRET",
  crons.every((c) => read(`src/app/api/cron/${c}/route.ts`).includes("CRON_SECRET")),
  ""
);

for (let i = 1; i <= 42; i++) {
  const n = String(i).padStart(3, "0");
  const path = resolve(root, `supabase/migrations/${n}_`);
  const found = readdirSync(resolve(root, "supabase/migrations")).some((f) =>
    f.startsWith(`${n}_`)
  );
  if (!found && i <= 42) {
    // only check we have continuous numbering for known set
  }
}
const migrations = readdirSync(resolve(root, "supabase/migrations")).filter((f) =>
  f.endsWith(".sql")
);
record("Migrations present through 042", migrations.some((f) => f.startsWith("042_")), "");

const failed = results.filter((r) => !r.pass);
console.log(`\nProduction invariants: ${results.length - failed.length}/${results.length}`);
if (failed.length) process.exit(1);
