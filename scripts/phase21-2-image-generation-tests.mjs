/**
 * Phase 21.2 Content Studio image generation tests (mocked — no paid API calls)
 * Usage: npm run test:phase21-2-image
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

const { parseStudioVisualState, emptyStudioVisualState } = await import(
  "../src/lib/content/visual-types.ts"
);

const { mergeStudioVisualState } = await import(
  "../src/lib/content/visual-persistence.ts"
);

const { friendlyVisualErrorMessage } = await import(
  "../src/lib/content/visual-errors.ts"
);

const { OPENAI_IMAGE_SIZES, parseImageGenerationBody } = await import(
  "../src/lib/ai/media/validation.ts"
);

const { getAuthorizedMediaAsset } = await import(
  "../src/lib/ai/media/assets/access.ts"
);

// Visual state parsing
{
  const empty = parseStudioVisualState({});
  record("Empty studio visual state", empty.activeAssetId === null && empty.assets.length === 0, "");
  const parsed = parseStudioVisualState({
    activeAssetId: "a1",
    assets: [{ assetId: "a1", prompt: "test", createdAt: "2026-01-01" }],
  });
  record("Parses studio visual assets", parsed.assets.length === 1, "");
}

// Merge asset
{
  const next = mergeStudioVisualState(emptyStudioVisualState(), {
    assetId: "x",
    prompt: "hero",
    type: "image",
    audioSubtype: undefined,
    size: "1024x1024",
  });
  record("Merge sets active asset", next.activeAssetId === "x", "");
}

// Friendly errors
record(
  "Sanitizes provider leaks",
  !friendlyVisualErrorMessage("openai api key invalid", "provider_error").includes("openai"),
  ""
);
record(
  "Rate limit copy",
  friendlyVisualErrorMessage(null, "rate_limited").includes("wait"),
  ""
);

// Validation
{
  const ok = parseImageGenerationBody({ prompt: "A bottle on marble", size: "1024x1024" });
  record("Valid image body", "request" in ok, "");
  const badSize = parseImageGenerationBody({ prompt: "x", size: "999x999" });
  record("Rejects invalid size", "error" in badSize, "");
  record("OpenAI sizes defined", OPENAI_IMAGE_SIZES.length === 3, "");
}

// Workspace isolation (mirrors access helper expectations)
record(
  "Asset org mismatch blocked",
  (await getAuthorizedMediaAsset(
    {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                organization_id: "org-b",
                client_workspace_id: null,
                storage_bucket: "generated-media",
                storage_path: "generated/org-b/_org/image/x.png",
              },
              error: null,
            }),
          }),
        }),
      }),
    },
    "asset-1",
    "org-a",
    null
  )) === null,
  ""
);

// File presence
const paths = [
  "src/components/content/studio-visual-panel.tsx",
  "src/lib/content/visual-client.ts",
  "src/app/api/ai/media/assets/[assetId]/url/route.ts",
  "supabase/migrations/041_content_studio_visual.sql",
  "docs/phase-21-2-ai-image-generation.md",
];

for (const rel of paths) {
  record(`Exists ${rel}`, existsSync(resolve(root, rel)), "");
}

const studioView = readFileSync(
  resolve(root, "src/components/content/content-studio-view.tsx"),
  "utf8"
);
const visualClient = readFileSync(resolve(root, "src/lib/content/visual-client.ts"), "utf8");
record("Content Studio imports visual panel", studioView.includes("StudioVisualPanel"), "");
record("Job polling stays in visual-client", visualClient.includes("waitForImageJob"), "");
record("Visual client uses media image API", visualClient.includes("/api/ai/media/image"), "");

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed.`);
