/**
 * Phase 17.3 assistant deep context tests
 * Usage: node scripts/phase17-3-assistant-tests.mjs
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

function assertReportScope(ctx, report) {
  if (report.organizationId !== ctx.organizationId) return false;
  if (!ctx.clientWorkspaceId) return false;
  return report.clientWorkspaceId === ctx.clientWorkspaceId;
}

// Workspace isolation unit checks (mirrors resource-scope.ts)
{
  const ctxA = {
    organizationId: "org-a",
    clientWorkspaceId: "client-a",
    isAgency: true,
  };
  record(
    "Report scope allows matching client",
    assertReportScope(ctxA, {
      organizationId: "org-a",
      clientWorkspaceId: "client-a",
    }),
    "match"
  );
  record(
    "Report scope blocks other client",
    !assertReportScope(ctxA, {
      organizationId: "org-a",
      clientWorkspaceId: "client-b",
    }),
    "cross-client"
  );
  record(
    "Report scope blocks other org",
    !assertReportScope(ctxA, {
      organizationId: "org-b",
      clientWorkspaceId: "client-a",
    }),
    "cross-org"
  );
}

const toolsIndex = readFileSync(
  resolve(root, "src/lib/assistant/tools/index.ts"),
  "utf8"
);

for (const tool of [
  "get_report_context",
  "get_report_snapshot",
  "get_campaign_context",
  "repurpose_content",
  "generate_content_like",
  "create_strategy_plan",
  "get_strategy_plan",
  "update_strategy_plan",
  "create_content_from_plan",
]) {
  record(`Tool registered: ${tool}`, toolsIndex.includes(`name: "${tool}"`));
}

record(
  "Strategy migration file exists",
  existsSync(resolve(root, "supabase/migrations/025_strategy_plans.sql"))
);

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
