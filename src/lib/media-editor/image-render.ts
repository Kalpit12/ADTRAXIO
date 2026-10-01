import type { EditOperation } from "./types";

function getBrightnessContrast(ops: EditOperation[]): {
  brightness: number;
  contrast: number;
} {
  let brightness = 1;
  let contrast = 1;
  for (const op of ops) {
    if (op.type === "brightness") brightness = op.value;
    if (op.type === "contrast") contrast = op.value;
  }
  return { brightness, contrast };
}

function getCrop(ops: EditOperation[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const crop = ops.find((o) => o.type === "crop");
  if (!crop || crop.type !== "crop") return null;
  return crop;
}

function getTextOverlay(ops: EditOperation[]) {
  return ops.filter((o) => o.type === "textOverlay") as Extract<
    EditOperation,
    { type: "textOverlay" }
  >[];
}

export async function renderImageToBlob(
  imageUrl: string,
  operations: EditOperation[]
): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const crop = getCrop(operations);
  const sx = crop?.x ?? 0;
  const sy = crop?.y ?? 0;
  const sw = crop?.width ?? img.width;
  const sh = crop?.height ?? img.height;

  const resize = operations.find((o) => o.type === "resize");
  const dw = resize?.type === "resize" ? resize.width : sw;
  const dh = resize?.type === "resize" ? resize.height : sh;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(dw));
  canvas.height = Math.max(1, Math.round(dh));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  const { brightness, contrast } = getBrightnessContrast(operations);
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  for (const overlay of getTextOverlay(operations)) {
    ctx.fillStyle = overlay.color;
    ctx.font = `${overlay.fontSize}px sans-serif`;
    ctx.textAlign = overlay.align;
    const x =
      overlay.align === "center"
        ? overlay.x
        : overlay.align === "right"
          ? overlay.x
          : overlay.x;
    ctx.fillText(overlay.text, x, overlay.y);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to render image."));
      },
      "image/png",
      0.92
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image."));
    img.src = url;
  });
}
