import type { EditOperation, EditorMediaType, MediaEditSpec } from "./types";
import { EDIT_SPEC_VERSION } from "./types";

export function validateTrim(
  start: number,
  end: number,
  duration: number
): string | null {
  if (!Number.isFinite(duration) || duration <= 0) {
    return "Media duration is not available yet.";
  }
  if (start < 0 || end <= start || end > duration) {
    return "Trim range is invalid.";
  }
  return null;
}

export function validateVolume(level: number): string | null {
  if (!Number.isFinite(level) || level < 0 || level > 2) {
    return "Volume must be between 0 and 2.";
  }
  return null;
}

export function parseEditOperations(raw: unknown): EditOperation[] | null {
  if (!Array.isArray(raw)) return null;
  const ops: EditOperation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const op = item as Record<string, unknown>;
    const type = op.type;
    if (type === "trim") {
      if (
        typeof op.start !== "number" ||
        typeof op.end !== "number"
      ) {
        return null;
      }
      ops.push({ type: "trim", start: op.start, end: op.end });
    } else if (type === "volume") {
      if (typeof op.level !== "number") return null;
      ops.push({ type: "volume", level: op.level });
    } else if (type === "brightness" || type === "contrast") {
      if (typeof op.value !== "number") return null;
      ops.push({ type, value: op.value } as EditOperation);
    } else if (type === "aspectRatio") {
      const ratio = op.ratio;
      if (
        ratio !== "1:1" &&
        ratio !== "16:9" &&
        ratio !== "9:16" &&
        ratio !== "4:5"
      ) {
        return null;
      }
      ops.push({ type: "aspectRatio", ratio });
    } else if (type === "textOverlay") {
      if (
        typeof op.text !== "string" ||
        typeof op.x !== "number" ||
        typeof op.y !== "number" ||
        typeof op.fontSize !== "number"
      ) {
        return null;
      }
      const align =
        op.align === "center" || op.align === "right" ? op.align : "left";
      ops.push({
        type: "textOverlay",
        text: op.text.slice(0, 500),
        x: op.x,
        y: op.y,
        fontSize: Math.min(120, Math.max(8, op.fontSize)),
        align,
        color: typeof op.color === "string" ? op.color : "#ffffff",
      });
    } else if (type === "crop") {
      if (
        typeof op.x !== "number" ||
        typeof op.y !== "number" ||
        typeof op.width !== "number" ||
        typeof op.height !== "number"
      ) {
        return null;
      }
      ops.push({
        type: "crop",
        x: op.x,
        y: op.y,
        width: op.width,
        height: op.height,
      });
    } else if (type === "resize") {
      if (typeof op.width !== "number" || typeof op.height !== "number") {
        return null;
      }
      ops.push({ type: "resize", width: op.width, height: op.height });
    } else {
      return null;
    }
  }
  return ops;
}

export function buildEditSpec(
  sourceAssetId: string,
  mediaType: EditorMediaType,
  operations: EditOperation[]
): MediaEditSpec {
  return {
    version: EDIT_SPEC_VERSION,
    sourceAssetId,
    mediaType,
    operations,
  };
}

export function parseEditSpec(raw: unknown): MediaEditSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== EDIT_SPEC_VERSION) return null;
  if (typeof r.sourceAssetId !== "string") return null;
  if (r.mediaType !== "image" && r.mediaType !== "video" && r.mediaType !== "audio") {
    return null;
  }
  const operations = parseEditOperations(r.operations);
  if (!operations) return null;
  return {
    version: EDIT_SPEC_VERSION,
    sourceAssetId: r.sourceAssetId,
    mediaType: r.mediaType,
    operations,
  };
}
