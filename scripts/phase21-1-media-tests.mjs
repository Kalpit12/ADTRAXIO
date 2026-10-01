/**
 * Phase 21.1 AI media infrastructure tests (mocked providers — no paid API calls)
 * Usage: npm run test:phase21-1-media
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

const {
  normalizeProviderError,
  safeUserMessage,
  MediaGenerationError,
} = await import("../src/lib/ai/media/errors.ts");

const { canTransitionStatus, assertStatusTransition } = await import(
  "../src/lib/ai/media/status.ts"
);

const { parseImageGenerationBody, parseVideoGenerationBody } = await import(
  "../src/lib/ai/media/validation.ts"
);

const { DEFAULT_PROVIDER_BY_MEDIA } = await import("../src/lib/ai/media/config.ts");

const { createOpenAIImageProvider } = await import(
  "../src/lib/ai/media/providers/openai-image.ts"
);

const { setMediaProviderRegistry, resetMediaProviderRegistry } = await import(
  "../src/lib/ai/media/providers/registry.ts"
);

// Provider selection
record(
  "Default image provider is OpenAI",
  DEFAULT_PROVIDER_BY_MEDIA.image === "openai",
  DEFAULT_PROVIDER_BY_MEDIA.image
);
record(
  "Default video provider is Google",
  DEFAULT_PROVIDER_BY_MEDIA.video === "google",
  DEFAULT_PROVIDER_BY_MEDIA.video
);
record(
  "Default audio provider is ElevenLabs",
  DEFAULT_PROVIDER_BY_MEDIA.audio === "elevenlabs",
  DEFAULT_PROVIDER_BY_MEDIA.audio
);

// Validation
{
  const ok = parseImageGenerationBody({ prompt: "A product hero shot" });
  record("Image prompt validation accepts valid body", "request" in ok, "");
  const bad = parseImageGenerationBody({ prompt: "" });
  record("Image prompt validation rejects empty prompt", "error" in bad, "");
  const video = parseVideoGenerationBody({ prompt: "Short ad clip" });
  record("Video prompt validation accepts valid body", "request" in video, "");
}

// Error normalization
{
  const err = normalizeProviderError("openai", new Error("x"), { httpStatus: 429 });
  record("429 maps to rate_limited", err.category === "rate_limited", err.category);
  const auth = normalizeProviderError("elevenlabs", new Error("x"), { httpStatus: 401 });
  record("401 maps to authentication_error", auth.category === "authentication_error", auth.category);
  const msg = safeUserMessage("content_policy");
  record("Safe user messages omit secrets", !msg.includes("API") && msg.length > 0, msg);
  const wrapped = new MediaGenerationError("invalid_request", safeUserMessage("invalid_request"));
  record("MediaGenerationError preserves category", wrapped.category === "invalid_request", "");
}

// Status transitions
record("queued → processing allowed", canTransitionStatus("queued", "processing"), "");
record("completed → processing blocked", !canTransitionStatus("completed", "processing"), "");
try {
  assertStatusTransition("failed", "completed");
  record("failed → completed throws", false, "no throw");
} catch {
  record("failed → completed throws", true, "");
}

// Workspace isolation helper (scope check mirrors service)
function jobVisibleToScope(job, scope) {
  if (job.organizationId !== scope.organizationId) return false;
  if (scope.clientWorkspaceId && job.clientWorkspaceId && job.clientWorkspaceId !== scope.clientWorkspaceId) {
    return false;
  }
  return true;
}

const scopeA = { organizationId: "org-1", clientWorkspaceId: "client-1" };
record(
  "Job scope blocks other org",
  !jobVisibleToScope(
    { organizationId: "org-2", clientWorkspaceId: "client-1" },
    scopeA
  ),
  ""
);
record(
  "Job scope blocks other client workspace",
  !jobVisibleToScope(
    { organizationId: "org-1", clientWorkspaceId: "client-2" },
    scopeA
  ),
  ""
);

// Mock OpenAI image adapter (no network)
{
  const fakePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const mockFetch = async () => ({
    ok: true,
    async text() {
      return JSON.stringify({
        data: [{ b64_json: fakePng.toString("base64") }],
      });
    },
  });

  process.env.OPENAI_API_KEY = "test-key-mock";
  const provider = createOpenAIImageProvider(mockFetch);
  const result = await provider.generateImage({ prompt: "test" });
  record(
    "OpenAI image adapter returns buffer from mock",
    result.data.length > 0 && result.mimeType === "image/png",
    `${result.data.length} bytes`
  );
  delete process.env.OPENAI_API_KEY;
}

// File / route presence
const requiredPaths = [
  "src/lib/ai/media/service.ts",
  "src/app/api/ai/media/image/route.ts",
  "src/app/api/ai/media/video/route.ts",
  "src/app/api/ai/media/speech/route.ts",
  "src/app/api/ai/media/sound/route.ts",
  "src/app/api/ai/media/jobs/[jobId]/route.ts",
  "supabase/migrations/040_ai_media_infrastructure.sql",
  "docs/phase-21-1-ai-media-infrastructure.md",
];

for (const rel of requiredPaths) {
  record(`Exists ${rel}`, existsSync(resolve(root, rel)), "");
}

const migration = readFileSync(
  resolve(root, "supabase/migrations/040_ai_media_infrastructure.sql"),
  "utf8"
);
record(
  "Generated media bucket is private",
  migration.includes("'generated-media'") && migration.includes("false"),
  ""
);
record(
  "RLS enabled on generation jobs",
  migration.includes("ai_media_generation_jobs enable row level security"),
  ""
);

resetMediaProviderRegistry();

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed.`);
