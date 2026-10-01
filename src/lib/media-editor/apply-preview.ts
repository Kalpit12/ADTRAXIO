import type { EditOperation } from "./types";

export function getTrimRange(operations: EditOperation[]): {
  start: number;
  end: number | null;
} {
  const trim = operations.find((o) => o.type === "trim");
  if (!trim || trim.type !== "trim") {
    return { start: 0, end: null };
  }
  return { start: trim.start, end: trim.end };
}

export function getVolumeLevel(operations: EditOperation[]): number {
  const vol = operations.find((o) => o.type === "volume");
  if (!vol || vol.type !== "volume") return 1;
  return vol.level;
}

export function imagePreviewFilter(operations: EditOperation[]): string {
  let brightness = 1;
  let contrast = 1;
  for (const op of operations) {
    if (op.type === "brightness") brightness = op.value;
    if (op.type === "contrast") contrast = op.value;
  }
  return `brightness(${brightness}) contrast(${contrast})`;
}

export function getAspectRatioPadding(
  operations: EditOperation[]
): string | undefined {
  const ar = operations.find((o) => o.type === "aspectRatio");
  if (!ar || ar.type !== "aspectRatio") return undefined;
  switch (ar.ratio) {
    case "1:1":
      return "100%";
    case "16:9":
      return "56.25%";
    case "9:16":
      return "177.78%";
    case "4:5":
      return "125%";
    default:
      return undefined;
  }
}
