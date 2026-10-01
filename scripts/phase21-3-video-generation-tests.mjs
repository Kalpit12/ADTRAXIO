/**
 * Phase 21.3 video generation tests (mocked — no Veo/provider calls)
 * Usage: npm run test:phase21-3-video
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
  parseVideoGenerationBody,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATION_SECONDS,
} = await import("../src/lib/ai/media/validation.ts");

const { parseStudioVisualState, getActiveStudioVisualAsset } = await import(
  "../src/lib/content/visual-types.ts"
);

const { requestVideoGeneration, waitForVideoJob, waitForMediaJob } = await import(
  "../src/lib/content/visual-client.ts"
);

const { getAuthorizedMediaAsset } = await import(
  "../src/lib/ai/media/assets/access.ts"
);

// Validation
{
  const ok = parseVideoGenerationBody({
    prompt: "Product reveal",
    aspectRatio: "16:9",
    durationSeconds: 8,
  });
  record("Valid video body", "request" in ok, "");
  const badRatio = parseVideoGenerationBody({ prompt: "x", aspectRatio: "21:9" });
  record("Rejects unsupported aspect ratio", "error" in badRatio, "");
  const badDuration = parseVideoGenerationBody({ prompt: "x", durationSeconds: 12 });
  record("Rejects unsupported duration", "error" in badDuration, "");
  const refImg = parseVideoGenerationBody({ prompt: "x", referenceImage: "data" });
  record("Rejects reference image", "error" in refImg, "");
  record("Aspect ratios defined", VIDEO_ASPECT_RATIOS.length === 3, "");
  record("Durations defined", VIDEO_DURATION_SECONDS.length === 3, "");
}

// Backward compatible image drafts
{
  const legacy = parseStudioVisualState({
    activeAssetId: "img-1",
    assets: [{ assetId: "img-1", prompt: "hero", createdAt: "2026-01-01" }],
  });
  record("Legacy image asset defaults type image", legacy.assets[0]?.type === "image", "");
  const video = parseStudioVisualState({
    activeAssetId: "v1",
    activeMediaType: "video",
    assets: [
      { assetId: "v1", prompt: "clip", type: "video", createdAt: "2026-01-01" },
    ],
  });
  record("Parses video asset type", getActiveStudioVisualAsset(video)?.type === "video", "");
  const voice = parseStudioVisualState({
    activeAssetId: "a1",
    activeMediaType: "voice",
    assets: [
      {
        assetId: "a1",
        prompt: "Hello",
        type: "audio",
        audioSubtype: "voice",
        createdAt: "2026-01-01",
      },
    ],
  });
  record(
    "Parses voice asset",
    getActiveStudioVisualAsset(voice)?.audioSubtype === "voice",
    ""
  );
}

// Mock fetch for video job flow
{
  let pollCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/api/ai/media/video") && init?.method === "POST") {
      return new Response(JSON.stringify({ job: { id: "job-v1", status: "queued", mediaAssetId: null } }), {
        status: 202,
      });
    }
    if (url.includes("/api/ai/media/jobs/job-v1")) {
      pollCount += 1;
      if (pollCount < 2) {
        return new Response(
          JSON.stringify({ job: { id: "job-v1", status: "processing", mediaAssetId: null } }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          job: { id: "job-v1", status: "completed", mediaAssetId: "asset-v1" },
        }),
        { status: 200 }
      );
    }
    return originalFetch(input, init);
  };

  const started = await requestVideoGeneration({
    prompt: "Test clip",
    aspectRatio: "16:9",
    durationSeconds: 8,
    idempotencyKey: "idem-1",
  });
  record("Video request returns job", "job" in started, "");

  const done = await waitForVideoJob("job-v1", {
    intervalMs: 1,
    maxAttempts: 5,
  });
  record("Video polling reaches completed", "assetId" in done && done.assetId === "asset-v1", "");
  record("Video polling hit processing", pollCount >= 2, `polls=${pollCount}`);

  globalThis.fetch = originalFetch;
}

// Polling timeout
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes("/api/ai/media/jobs/timeout-job")) {
      return new Response(
        JSON.stringify({ job: { id: "timeout-job", status: "processing", mediaAssetId: null } }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  };
  const timed = await waitForMediaJob("timeout-job", {
    intervalMs: 1,
    maxAttempts: 2,
    timeoutMessage: "timeout",
  });
  record("Polling timeout", "error" in timed && timed.error === "timeout", "");
  globalThis.fetch = originalFetch;
}

// Unauthorized asset
record(
  "Unauthorized asset blocked",
  (await getAuthorizedMediaAsset(
    {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                organization_id: "org-b",
                client_workspace_id: "cw-1",
                storage_bucket: "generated-media",
                storage_path: "generated/org-b/cw-1/video/x.mp4",
              },
              error: null,
            }),
          }),
        }),
      }),
    },
    "asset-v",
    "org-a",
    "cw-1"
  )) === null,
  ""
);

// UI / files
const panel = readFileSync(
  resolve(root, "src/components/content/studio-visual-panel.tsx"),
  "utf8"
);
record("Visual panel video mode", panel.includes('id: "video"'), "");
record("Native video preview", panel.includes("<video"), "");
record("Processing status copy", panel.includes("Processing your video"), "");
record("No reference image UI leak", !panel.includes("referenceImage"), "");

const assetRoute = readFileSync(
  resolve(root, "src/app/api/ai/media/assets/[assetId]/url/route.ts"),
  "utf8"
);
record("Signed URL route shared for assets", assetRoute.includes("createSignedMediaAssetUrl"), "");

for (const rel of ["docs/phase-21-3-ai-video-generation.md"]) {
  record(`Exists ${rel}`, existsSync(resolve(root, rel)), "");
}

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed.`);
