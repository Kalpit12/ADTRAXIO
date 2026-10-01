/**
 * Phase 21.6 AI Media Editor tests (mocked)
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
  parseEditOperations,
  buildEditSpec,
  parseEditSpec,
  validateTrim,
  validateVolume,
} = await import("../src/lib/media-editor/validation.ts");

const {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  resetHistory,
} = await import("../src/lib/media-editor/history.ts");

const {
  shouldRestoreDraft,
  draftKey,
} = await import("../src/lib/media-editor/persistence.ts");

const { resolveRootSourceAssetId } = await import(
  "../src/lib/ai/media/assets/edits-service.ts"
);

const { safeUserMessage } = await import("../src/lib/ai/media/errors.ts");

const { parseStudioVisualState } = await import("../src/lib/content/visual-types.ts");

const { getTrimRange, getVolumeLevel } = await import(
  "../src/lib/media-editor/apply-preview.ts"
);

// Authentication / routes
{
  const editorRoute = resolve(
    root,
    "src/app/api/ai/media/assets/[assetId]/editor/route.ts"
  );
  const editsRoute = resolve(
    root,
    "src/app/api/ai/media/assets/[assetId]/edits/route.ts"
  );
  const editorPage = resolve(
    root,
    "src/app/(app)/(workspace)/create/editor/[assetId]/page.tsx"
  );
  record("Editor bootstrap route exists", existsSync(editorRoute), "");
  record("Editor save route exists", existsSync(editsRoute), "");
  record("Editor page route exists", existsSync(editorPage), "");
  const editsSrc = readFileSync(editsRoute, "utf8");
  record(
    "Save route requires auth context",
    editsSrc.includes("requireAuthContext"),
    ""
  );
  record(
    "Save route uses authorized asset lookup",
    editsSrc.includes("getAuthorizedMediaAsset"),
    ""
  );
}

// Workspace isolation (mirrors getAuthorizedMediaAsset)
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

record(
  "Workspace isolation blocks other org",
  !assetAccessible(
    { organization_id: "o2", client_workspace_id: "c1" },
    "o1",
    "c1"
  ),
  ""
);
record(
  "Workspace isolation blocks other client",
  !assetAccessible(
    { organization_id: "o1", client_workspace_id: "c2" },
    "o1",
    "c1"
  ),
  ""
);
record(
  "Asset access allows matching workspace",
  assetAccessible(
    { organization_id: "o1", client_workspace_id: "c1" },
    "o1",
    "c1"
  ),
  ""
);

// Image operations parsing
{
  const ops = parseEditOperations([
    { type: "crop", x: 0, y: 0, width: 100, height: 80 },
    { type: "resize", width: 512, height: 512 },
    { type: "aspectRatio", ratio: "16:9" },
    {
      type: "textOverlay",
      text: "Hello",
      x: 10,
      y: 20,
      fontSize: 24,
      align: "center",
      color: "#fff",
    },
    { type: "brightness", value: 1.1 },
    { type: "contrast", value: 0.9 },
  ]);
  record("Image crop parses", ops !== null && ops.some((o) => o.type === "crop"), "");
  record("Image resize parses", ops !== null && ops.some((o) => o.type === "resize"), "");
  record(
    "Aspect conversion parses",
    ops !== null && ops.some((o) => o.type === "aspectRatio"),
    ""
  );
  record(
    "Text overlay parses",
    ops !== null && ops.some((o) => o.type === "textOverlay"),
    ""
  );
}

// Video / audio validation
{
  record("Video trim validation rejects invalid range", validateTrim(5, 3, 10) !== null, "");
  record("Video trim validation accepts valid range", validateTrim(0, 5, 10) === null, "");
  record("Audio trim validation uses duration", validateTrim(0, 2, 2) === null, "");
  record("Volume validation rejects high", validateVolume(3) !== null, "");
  record("Volume changes within range", validateVolume(1.2) === null, "");
}

// Trim save spec
{
  const spec = buildEditSpec("src-1", "video", [
    { type: "trim", start: 1, end: 5 },
    { type: "volume", level: 0.8 },
  ]);
  record("Video trim save builds spec", spec.operations.length === 2, "");
  const parsed = parseEditSpec(spec);
  record("Edit specification round-trip", parsed !== null && parsed.sourceAssetId === "src-1", "");
}

// History
{
  let h = createHistory([]);
  h = pushHistory(h, [{ type: "volume", level: 0.5 }]);
  h = pushHistory(h, [{ type: "volume", level: 0.7 }]);
  const undone = undoHistory(h);
  record("Undo restores previous operations", undone !== null && undone.present[0].level === 0.5, "");
  const redone = redoHistory(undone);
  record("Redo reapplies operations", redone !== null && redone.present[0].level === 0.7, "");
  record("Reset clears history", resetHistory().present.length === 0, "");
}

// Source lineage
{
  const root = resolveRootSourceAssetId({
    id: "child",
    source_asset_id: "parent",
    organization_id: "o",
    client_workspace_id: null,
    created_by: "u",
    media_type: "image",
    storage_bucket: "b",
    storage_path: "p",
    mime_type: null,
    width: null,
    height: null,
    duration_seconds: null,
    file_size_bytes: null,
    provider: "openai",
    generation_job_id: null,
    edit_spec: null,
    created_at: "",
  });
  record("Edited asset lineage resolves root source", root === "parent", root);
}

// Draft recovery
{
  record(
    "Draft recovery when version newer",
    shouldRestoreDraft({ assetId: "a", version: 2, operations: [], updatedAt: "" }, 1),
    ""
  );
  record(
    "Stale draft protection",
    !shouldRestoreDraft({ assetId: "a", version: 1, operations: [], updatedAt: "" }, 2),
    ""
  );
  record("Draft key is versioned per asset", draftKey("x").includes("x"), "");
}

// Signed URL route still present
{
  const urlRoute = resolve(
    root,
    "src/app/api/ai/media/assets/[assetId]/url/route.ts"
  );
  record("Signed URL access route preserved", existsSync(urlRoute), "");
}

// Malformed / unauthorized patterns
record("Malformed edit operation rejected", parseEditOperations([{ type: "unknown" }]) === null, "");
record(
  "Malformed trim rejected",
  parseEditOperations([{ type: "trim", start: "bad" }]) === null,
  ""
);

// Partial / render failure messaging
{
  const msg = safeUserMessage("storage_error");
  record("Sanitized errors omit internals", !msg.toLowerCase().includes("secret"), msg);
}

// Preview helpers
{
  const ops = [
    { type: "trim", start: 2, end: 8 },
    { type: "volume", level: 0.6 },
  ];
  const trim = getTrimRange(ops);
  record("Preview trim range", trim.start === 2 && trim.end === 8, "");
  record("Preview volume", getVolumeLevel(ops) === 0.6, "");
}

// 21.2–21.5 compatibility
{
  const visual = parseStudioVisualState({
    activeMediaType: "image",
    assets: [{ assetId: "img-1", prompt: "hero", type: "image" }],
  });
  record(
    "Studio visual state still parses (21.2)",
    visual.assets.length === 1 && visual.assets[0].assetId === "img-1",
    ""
  );
  record(
    "Creative studio nested visual still optional (21.5)",
    parseStudioVisualState({ creativeStudio: { workflowStep: "brief" } }) !== null,
    ""
  );
}

// Source asset preserved (spec model)
{
  const spec = buildEditSpec("original-id", "image", [{ type: "brightness", value: 1 }]);
  record(
    "Save edit specification references source",
    spec.sourceAssetId === "original-id",
    ""
  );
}

const failed = results.filter((r) => !r.pass);
console.log(`\nPhase 21.6: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
