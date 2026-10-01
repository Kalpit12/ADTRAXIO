import { friendlyVisualErrorMessage } from "@/lib/content/visual-errors";
import {
  requestImageGeneration,
  requestSoundGeneration,
  requestSpeechGeneration,
  requestVideoGeneration,
  waitForAudioJob,
  waitForImageJob,
  waitForVideoJob,
} from "@/lib/content/visual-client";
import type { CreativeAssetSlot, CreativeConcept } from "./creative-studio-types";
import { VOICE_PRESET_OPTIONS } from "./visual-types";

export function promptForAssetSlot(
  concept: CreativeConcept,
  kind: CreativeAssetSlot["kind"]
): string {
  switch (kind) {
    case "image":
      return concept.visualDirection || concept.creativeAngle;
    case "video":
      return concept.visualDirection || concept.creativeAngle;
    case "voice":
      return concept.voiceoverDirection || concept.primaryCopy;
    case "sound":
      return concept.soundDirection || "Short subtle brand sound";
    default:
      return concept.creativeAngle;
  }
}

export async function generateAssetForSlot(
  concept: CreativeConcept,
  slot: CreativeAssetSlot,
  options?: { signal?: AbortSignal; onProcessing?: () => void }
): Promise<{ assetId: string } | { error: string }> {
  const idempotencyKey = `creative-slot-${slot.id}-${crypto.randomUUID()}`;
  const prompt = promptForAssetSlot(concept, slot.kind);

  try {
    if (slot.kind === "image") {
      const started = await requestImageGeneration({
        prompt,
        size: "1024x1024",
        idempotencyKey,
      });
      if ("error" in started) {
        return {
          error: friendlyVisualErrorMessage(started.error, started.category),
        };
      }
      const done = await waitForImageJob(started.job.id, {
        signal: options?.signal,
      });
      if ("error" in done) {
        return { error: friendlyVisualErrorMessage(done.error, done.category) };
      }
      return { assetId: done.assetId };
    }

    if (slot.kind === "video") {
      const started = await requestVideoGeneration({
        prompt,
        aspectRatio: "16:9",
        durationSeconds: 8,
        idempotencyKey,
      });
      if ("error" in started) {
        return {
          error: friendlyVisualErrorMessage(started.error, started.category),
        };
      }
      const done = await waitForVideoJob(started.job.id, {
        signal: options?.signal,
        onStatus: (status) => {
          if (status === "processing") options?.onProcessing?.();
        },
      });
      if ("error" in done) {
        return { error: friendlyVisualErrorMessage(done.error, done.category) };
      }
      return { assetId: done.assetId };
    }

    if (slot.kind === "voice") {
      const started = await requestSpeechGeneration({
        text: prompt,
        voiceId: VOICE_PRESET_OPTIONS[0].id,
        idempotencyKey,
      });
      if ("error" in started) {
        return {
          error: friendlyVisualErrorMessage(started.error, started.category),
        };
      }
      const done = await waitForAudioJob(started.job.id, {
        signal: options?.signal,
        onStatus: (status) => {
          if (status === "processing") options?.onProcessing?.();
        },
      });
      if ("error" in done) {
        return { error: friendlyVisualErrorMessage(done.error, done.category) };
      }
      return { assetId: done.assetId };
    }

    const started = await requestSoundGeneration({
      text: prompt,
      durationSeconds: 3,
      idempotencyKey,
    });
    if ("error" in started) {
      return {
        error: friendlyVisualErrorMessage(started.error, started.category),
      };
    }
    const done = await waitForAudioJob(started.job.id, {
      signal: options?.signal,
      onStatus: (status) => {
        if (status === "processing") options?.onProcessing?.();
      },
    });
    if ("error" in done) {
      return { error: friendlyVisualErrorMessage(done.error, done.category) };
    }
    return { assetId: done.assetId };
  } catch {
    return { error: friendlyVisualErrorMessage(null) };
  }
}
