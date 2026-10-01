/**
 * Phase 21.4 voice & audio tests (mocked — no ElevenLabs calls)
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
  parseSpeechGenerationBody,
  parseSoundGenerationBody,
  ELEVENLABS_VOICE_PRESETS,
  SOUND_DURATION_SECONDS,
} = await import("../src/lib/ai/media/validation.ts");

const {
  parseStudioVisualState,
  panelModeMatchesAsset,
  contentPreviewMediaType,
} = await import("../src/lib/content/visual-types.ts");

const {
  requestSpeechGeneration,
  requestSoundGeneration,
  waitForAudioJob,
} = await import("../src/lib/content/visual-client.ts");

const { getAuthorizedMediaAsset } = await import(
  "../src/lib/ai/media/assets/access.ts"
);

// Speech validation
{
  const ok = parseSpeechGenerationBody({ text: "Hello world" });
  record("Valid speech body", "request" in ok, "");
  const bad = parseSpeechGenerationBody({ text: "" });
  record("Invalid speech text", "error" in bad, "");
  const voice = parseSpeechGenerationBody({
    text: "Hi",
    voiceId: ELEVENLABS_VOICE_PRESETS[0],
  });
  record("Valid voice preset", "request" in voice, "");
  const badVoice = parseSpeechGenerationBody({ text: "Hi", voiceId: "bad-id" });
  record("Unsupported voice", "error" in badVoice, "");
  const model = parseSpeechGenerationBody({ text: "Hi", model: "x" });
  record("Unsupported speech model", "error" in model, "");
}

// Sound validation
{
  const ok = parseSoundGenerationBody({
    text: "Camera shutter",
    durationSeconds: 3,
  });
  record("Valid sound body", "request" in ok, "");
  const badDur = parseSoundGenerationBody({ text: "x", durationSeconds: 7 });
  record("Unsupported sound duration", "error" in badDur, "");
  record("Sound durations defined", SOUND_DURATION_SECONDS.length === 3, "");
}

// Metadata / backward compat
{
  const image = parseStudioVisualState({
    activeAssetId: "i1",
    assets: [{ assetId: "i1", prompt: "p", type: "image", createdAt: "t" }],
  });
  record("Image draft still parses", image.assets[0]?.type === "image", "");
  const video = parseStudioVisualState({
    assets: [{ assetId: "v1", prompt: "p", type: "video", createdAt: "t" }],
  });
  record("Video draft still parses", video.assets[0]?.type === "video", "");
  const voiceAsset = {
    assetId: "a1",
    prompt: "script",
    type: "audio",
    audioSubtype: "voice",
    createdAt: "t",
  };
  record(
    "Voice panel matches asset",
    panelModeMatchesAsset("voice", voiceAsset),
    ""
  );
  record(
    "Sound panel matches asset",
    panelModeMatchesAsset("sound", {
      ...voiceAsset,
      audioSubtype: "sound",
    }),
    ""
  );
  record(
    "Content preview audio type",
    contentPreviewMediaType(voiceAsset) === "audio",
    ""
  );
}

// Mock speech + sound job flow
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/api/ai/media/speech") && init?.method === "POST") {
      return new Response(JSON.stringify({ job: { id: "job-sp", status: "queued" } }), {
        status: 202,
      });
    }
    if (url.includes("/api/ai/media/sound") && init?.method === "POST") {
      return new Response(JSON.stringify({ job: { id: "job-snd", status: "queued" } }), {
        status: 202,
      });
    }
    if (url.includes("/api/ai/media/jobs/job-sp")) {
      return new Response(
        JSON.stringify({
          job: { id: "job-sp", status: "completed", mediaAssetId: "asset-sp" },
        }),
        { status: 200 }
      );
    }
    if (url.includes("/api/ai/media/jobs/job-snd")) {
      return new Response(
        JSON.stringify({
          job: { id: "job-snd", status: "completed", mediaAssetId: "asset-snd" },
        }),
        { status: 200 }
      );
    }
    return originalFetch(input, init);
  };

  const speech = await requestSpeechGeneration({ text: "Narration", idempotencyKey: "k1" });
  record("Speech job created", "job" in speech, "");
  const sound = await requestSoundGeneration({
    text: "Shutter",
    durationSeconds: 5,
    idempotencyKey: "k2",
  });
  record("Sound job created", "job" in sound, "");

  const doneSpeech = await waitForAudioJob("job-sp", { intervalMs: 1, maxAttempts: 3 });
  record("Speech polling completed", "assetId" in doneSpeech, "");
  const doneSound = await waitForAudioJob("job-snd", { intervalMs: 1, maxAttempts: 3 });
  record("Sound polling completed", "assetId" in doneSound, "");

  globalThis.fetch = originalFetch;
}

// Unauthorized asset
record(
  "Unauthorized audio asset blocked",
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
                storage_path: "generated/org-b/_org/audio/x.mp3",
              },
              error: null,
            }),
          }),
        }),
      }),
    },
    "asset-a",
    "org-a",
    null
  )) === null,
  ""
);

const panel = readFileSync(
  resolve(root, "src/components/content/studio-visual-panel.tsx"),
  "utf8"
);
record("Voice mode in panel", panel.includes('"voice"'), "");
record("Sound mode in panel", panel.includes('"sound"'), "");
record("Native audio preview", panel.includes("<audio"), "");
record("Voiceover status copy", panel.includes("Creating your voiceover"), "");

for (const rel of ["docs/phase-21-4-ai-voice-audio.md"]) {
  record(`Exists ${rel}`, existsSync(resolve(root, rel)), "");
}

const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.error(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed.`);
