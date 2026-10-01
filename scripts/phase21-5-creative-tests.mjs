/**
 * Phase 21.5 Creative Studio tests (mocked)
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
  parseCreativeConcept,
  buildAssetPlanFromConcept,
  conceptToGeneratedCreative,
  updateAssetSlot,
  removeAssetSlot,
  derivePackageStatus,
  syncVisualAssetsFromSlots,
} = await import("../src/lib/content/creative-studio.ts");

const { defaultSuggestedMedia, emptyCreativeStudioSnapshot } = await import(
  "../src/lib/content/creative-studio-types.ts"
);

const { parseStudioVisualState } = await import("../src/lib/content/visual-types.ts");

const { validateCreativeBrief } = await import("../src/lib/content/validation.ts");

const { promptForAssetSlot } = await import(
  "../src/lib/content/creative-studio-assets.ts"
);

// Concept parsing
{
  const concept = parseCreativeConcept({
    creativeAngle: "Angle",
    hook: "Hook",
    headline: "Headline",
    primaryCopy: "Copy",
    suggestedMedia: ["image", "voice"],
  });
  record("Structured concept parses", concept !== null, "");
  record("Malformed concept rejected", parseCreativeConcept({ hook: 1 }) === null, "");
  const plan = concept ? buildAssetPlanFromConcept(concept) : [];
  record("Asset plan from concept", plan.length === 2, "");
  const creative = concept ? conceptToGeneratedCreative(concept) : null;
  record(
    "Concept maps to GeneratedCreative",
    creative !== null && creative.headline === "Headline",
    ""
  );
}

// Brief validation
{
  const errors = validateCreativeBrief({
    contentType: "social_post",
    goal: "awareness",
    platform: "instagram",
    audience: "",
    tone: "professional",
    topic: "short",
    additionalContext: "",
    cta: "",
  });
  record("Brief validation catches incomplete", Object.keys(errors).length > 0, "");
}

// Partial failure / slots
{
  let slots = buildAssetPlanFromConcept({
    creativeAngle: "a",
    hook: "h",
    headline: "hl",
    primaryCopy: "pc",
    cta: "",
    caption: "",
    hashtags: [],
    visualDirection: "v",
    voiceoverDirection: "vo",
    soundDirection: "s",
    suggestedMedia: ["image", "video"],
  });
  slots = updateAssetSlot(slots, "slot-image", {
    status: "ready",
    assetId: "img-1",
  });
  slots = updateAssetSlot(slots, "slot-video", {
    status: "failed",
    errorMessage: "failed",
  });
  const status = derivePackageStatus({
    ...emptyCreativeStudioSnapshot(),
    concept: null,
    assetSlots: slots,
  });
  record("Partial failure needs_changes", status === "needs_changes", status);
  record("Remove slot", removeAssetSlot(slots, "slot-video").length === 1, "");
}

// Backward compatibility
{
  const legacyImage = parseStudioVisualState({
    activeAssetId: "i1",
    assets: [{ assetId: "i1", prompt: "p", type: "image", createdAt: "t" }],
  });
  record("Legacy image draft", legacyImage.assets[0]?.type === "image", "");
  const legacyVideo = parseStudioVisualState({
    assets: [{ assetId: "v1", prompt: "p", type: "video", createdAt: "t" }],
  });
  record("Legacy video draft", legacyVideo.assets[0]?.type === "video", "");
  const legacyAudio = parseStudioVisualState({
    assets: [
      {
        assetId: "a1",
        prompt: "p",
        type: "audio",
        audioSubtype: "voice",
        createdAt: "t",
      },
    ],
  });
  record("Legacy audio draft", legacyAudio.assets[0]?.audioSubtype === "voice", "");
}

// Sync assets
{
  const synced = syncVisualAssetsFromSlots(
    [
      {
        id: "slot-image",
        kind: "image",
        label: "Visual",
        status: "ready",
        assetId: "x",
      },
    ],
    []
  );
  record("Slot sync creates asset ref", synced.length === 1 && synced[0].type === "image", "");
}

// Prompt helper
{
  const p = promptForAssetSlot(
    {
      creativeAngle: "a",
      hook: "h",
      headline: "hl",
      primaryCopy: "pc",
      cta: "c",
      caption: "cap",
      hashtags: [],
      visualDirection: "visual dir",
      voiceoverDirection: "voice dir",
      soundDirection: "sound dir",
      suggestedMedia: ["image"],
    },
    "voice"
  );
  record("Voice prompt uses direction", p === "voice dir", "");
}

// No auto generation on load
const view = readFileSync(
  resolve(root, "src/components/creative-studio/creative-studio-view.tsx"),
  "utf8"
);
record("No auto media on mount", !view.includes("useEffect") || !view.match(/useEffect\([^)]*generateAsset/), "static check");
record("Explicit generate concept", view.includes("handleGenerateConcept"), "");
record("Route exists", existsSync(resolve(root, "src/app/(app)/(workspace)/create/creative/page.tsx")), "");
record("API route exists", existsSync(resolve(root, "src/app/api/ai/creative-concept/route.ts")), "");
record("Docs exist", existsSync(resolve(root, "docs/phase-21-5-ai-creative-studio.md")), "");

record(
  "Reel suggests video in plan",
  defaultSuggestedMedia({
    contentType: "reel",
    goal: "awareness",
    platform: "instagram",
    audience: "a",
    tone: "professional",
    topic: "topic here enough",
    additionalContext: "",
    cta: "",
  }).includes("video"),
  ""
);

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed.`);
