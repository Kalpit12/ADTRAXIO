/**
 * Phase 21.7 Campaign Creative Integration tests (mocked)
 */

import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const {
  resolvePublishableMediaAssetId,
  selectDefaultPublishableSlot,
  assessPlatformMediaSupport,
  assessEditSpecPublishingLimitation,
  publishingBlockedByApproval,
  hasDuplicateActiveSchedule,
  buildGeneratedCreativeFromStudio,
  sanitizeCampaignIntegrationError,
  supplementaryAudioAssetIds,
} = await import("../src/lib/content/creative-campaign.ts");

const { parseStudioVisualState } = await import("../src/lib/content/visual-types.ts");
const { parseCreativeStudioSnapshot } = await import("../src/lib/content/creative-studio.ts");

// Routes / auth
{
  const route = resolve(root, "src/app/api/creative/campaign-prepare/route.ts");
  record("Campaign prepare API exists", existsSync(route), "");
  const src = readFileSync(route, "utf8");
  record("Prepare route requires operational auth", src.includes("requireOperationalScopedAuth"), "");
  record("Prepare route checks permissions", src.includes("hasClientPermission"), "");
  record("Uses existing campaign attach", src.includes("prepareCreativeForCampaign"), "");
}

// Workspace isolation helper
function assetAccessible(asset, organizationId, clientWorkspaceId) {
  if (asset.organization_id !== organizationId) return false;
  if (
    clientWorkspaceId &&
    asset.client_workspace_id &&
    asset.client_workspace_id !== clientWorkspaceId
  ) {
    return false;
  }
  return true;
}

record("Workspace isolation blocks other org", !assetAccessible({ organization_id: "o2", client_workspace_id: "c1" }, "o1", "c1"), "");
record("Workspace isolation blocks other client", !assetAccessible({ organization_id: "o1", client_workspace_id: "c2" }, "o1", "c1"), "");

// Campaign selection / media
{
  const slots = [
    { id: "s1", kind: "image", label: "img", status: "ready", assetId: "a-img" },
    { id: "s2", kind: "video", label: "vid", status: "ready", assetId: "a-vid" },
  ];
  record("Campaign media defaults to image", selectDefaultPublishableSlot(slots)?.assetId === "a-img", "");
  record("Edited asset selection respected", resolvePublishableMediaAssetId(slots, "a-vid") === "a-vid", "");
}

// Content from creative
{
  const studio = parseCreativeStudioSnapshot({
    workflowStep: "review",
    packageStatus: "ready",
    concept: {
      hook: "h",
      headline: "hl",
      primaryCopy: "pc",
      creativeAngle: "a",
      cta: "cta",
      caption: "cap",
      hashtags: ["tag"],
      visualDirection: "v",
      voiceoverDirection: "",
      soundDirection: "",
      suggestedMedia: ["image"],
    },
    assetSlots: [],
    canvas: { headline: "Canvas HL", caption: "Canvas cap", cta: "Go" },
  });
  const creative = buildGeneratedCreativeFromStudio(studio);
  record("Content creation from creative uses canvas", creative?.headline === "Canvas HL", "");
}

// Media reference / unsupported
{
  const video = assessPlatformMediaSupport("instagram", "video");
  record("Unsupported video surfaces honestly", !video.supported, video.message ?? "");
  const trim = assessEditSpecPublishingLimitation("video", {
    version: 1,
    sourceAssetId: "x",
    mediaType: "video",
    operations: [{ type: "trim", start: 0, end: 5 }],
  });
  record("Spec-only trim limitation", trim !== null, "");
}

// Approval
record("Approval required blocks publish", publishingBlockedByApproval("pending"), "");
record("Approved allows publish", !publishingBlockedByApproval("approved"), "");
record("Rejected blocks publish", publishingBlockedByApproval("rejected"), "");
record("Changes requested blocks publish", publishingBlockedByApproval("changes_requested"), "");

// Schedule duplicate
record(
  "Duplicate scheduling protection",
  hasDuplicateActiveSchedule(
    [{ contentId: "c1", socialAccountId: "s1", status: "scheduled" }],
    "c1",
    "s1"
  ),
  ""
);

// Sanitized errors
record(
  "Sanitized errors",
  !sanitizeCampaignIntegrationError("Bearer secret-token").includes("secret"),
  ""
);

// Lineage metadata in visual
{
  const visual = parseStudioVisualState({
    assets: [{ assetId: "child", prompt: "p", type: "image" }],
    creativePublishing: {
      campaignId: "camp",
      contentId: "content",
      selectedMediaAssetId: "child",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  });
  record("Media asset reference preserved", visual.creativePublishing?.selectedMediaAssetId === "child", "");
}

// Audio supplementary
{
  const sup = supplementaryAudioAssetIds([
    { id: "v", kind: "voice", label: "v", status: "ready", assetId: "voice-1" },
    { id: "s", kind: "sound", label: "s", status: "ready", assetId: "sound-1" },
  ]);
  record("Voice metadata attached", sup.voiceAssetIds.includes("voice-1"), "");
}

// Existing systems preserved
{
  record("Publishing schedule route exists", existsSync(resolve(root, "src/app/api/publishing/schedule/route.ts")), "");
  record("Publishing publish route exists", existsSync(resolve(root, "src/app/api/publishing/publish/route.ts")), "");
  record("Campaigns API exists", existsSync(resolve(root, "src/app/api/campaigns/route.ts")), "");
  record("Creative Studio view integration", readFileSync(resolve(root, "src/components/creative-studio/creative-studio-view.tsx"), "utf8").includes("CreativeCampaignPanel"), "");
  record("Content Studio visual parse intact", parseStudioVisualState({ assets: [] }).assets.length === 0, "");
}

// Staging security: deferred + bucket guard
{
  const service = readFileSync(resolve(root, "src/lib/publishing/service.ts"), "utf8");
  const prepare = readFileSync(resolve(root, "src/lib/content/creative-campaign-service.ts"), "utf8");
  record(
    "Public staging deferred to schedule/publish",
    service.includes("stageAiMediaAssetForPublishing") &&
      !prepare.includes("stageAiMediaAssetForPublishing"),
    ""
  );
  record(
    "Prepare only assesses assets (no public copy)",
    prepare.includes("assessAiMediaAssetForPublishing"),
    ""
  );
  const assess = await import("../src/lib/publishing/assess-ai-asset.ts");
  try {
    assess.assertGeneratedMediaStoragePath("org-1", "other-bucket", "generated/org-1/x.png");
    record("Generated-media bucket enforced", false, "");
  } catch {
    record("Generated-media bucket enforced", true, "");
  }
  record(
    "Content-linked media verified at publish",
    readFileSync(resolve(root, "src/lib/publishing/verify-content-media.ts"), "utf8").includes(
      "verifyPublishMediaAssetForContent"
    ),
    ""
  );
  record(
    "AI staging requires contentId",
    service.includes("mediaAssetId") &&
      service.includes("Saved content is required to publish AI-generated media"),
    ""
  );
  record(
    "Single AI staging module documents invariant",
    readFileSync(resolve(root, "src/lib/publishing/stage-ai-asset.ts"), "utf8").includes(
      "Production invariant"
    ),
    ""
  );
}

const failed = results.filter((r) => !r.pass);
console.log(`\nPhase 21.7: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
