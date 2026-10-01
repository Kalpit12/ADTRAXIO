export const EDIT_SPEC_VERSION = 1;

export type EditorMediaType = "image" | "video" | "audio";

export type EditOperation =
  | {
      type: "crop";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | { type: "resize"; width: number; height: number }
  | { type: "aspectRatio"; ratio: "1:1" | "16:9" | "9:16" | "4:5" }
  | {
      type: "textOverlay";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      align: "left" | "center" | "right";
      color: string;
    }
  | { type: "brightness"; value: number }
  | { type: "contrast"; value: number }
  | { type: "trim"; start: number; end: number }
  | { type: "volume"; level: number };

export interface MediaEditSpec {
  version: number;
  sourceAssetId: string;
  mediaType: EditorMediaType;
  operations: EditOperation[];
}

export type EditorSaveStatus =
  | "draft"
  | "dirty"
  | "saved"
  | "rendering"
  | "failed";

export interface EditorDraftState {
  assetId: string;
  version: number;
  operations: EditOperation[];
  updatedAt: string;
}

export const MAX_HISTORY = 50;
