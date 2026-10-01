"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StudioInput } from "@/components/content/studio-field";
import type { PublicMediaAsset } from "@/lib/ai/media/types";
import {
  getTrimRange,
  getVolumeLevel,
  imagePreviewFilter,
} from "@/lib/media-editor/apply-preview";
import {
  fetchEditorBootstrap,
  saveMediaEdit,
} from "@/lib/media-editor/editor-client";
import {
  createHistory,
  pushHistory,
  redoHistory,
  resetHistory,
  undoHistory,
  type EditHistory,
} from "@/lib/media-editor/history";
import { renderImageToBlob } from "@/lib/media-editor/image-render";
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
  shouldRestoreDraft,
} from "@/lib/media-editor/persistence";
import type { EditOperation, EditorSaveStatus } from "@/lib/media-editor/types";
import { validateTrim, validateVolume } from "@/lib/media-editor/validation";

interface MediaEditorViewProps {
  assetId: string;
}

function historyReducer(
  state: EditHistory,
  action:
    | { type: "set"; operations: EditOperation[] }
    | { type: "undo" }
    | { type: "redo" }
    | { type: "reset" }
): EditHistory {
  switch (action.type) {
    case "set":
      return pushHistory(state, action.operations);
    case "undo":
      return undoHistory(state) ?? state;
    case "redo":
      return redoHistory(state) ?? state;
    case "reset":
      return resetHistory();
    default:
      return state;
  }
}

export function MediaEditorView({ assetId }: MediaEditorViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") ?? "/create";
  const slotId = searchParams.get("slotId");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [asset, setAsset] = useState<PublicMediaAsset | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [rootSourceId, setRootSourceId] = useState(assetId);
  const [history, dispatchHistory] = useReducer(historyReducer, createHistory());
  const [savedVersion, setSavedVersion] = useState(0);
  const [status, setStatus] = useState<EditorSaveStatus>("draft");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const operations = history.present;
  const dirty = operations.length > 0 || status === "dirty";

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchEditorBootstrap(assetId);
      setAsset(data.asset);
      setMediaUrl(data.url);
      setRootSourceId(data.rootSourceAssetId);
      const draft = loadEditorDraft(assetId);
      if (draft && shouldRestoreDraft(draft, savedVersion)) {
        dispatchHistory({ type: "set", operations: draft.operations });
        setStatus("dirty");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unable to load editor.");
    } finally {
      setLoading(false);
    }
  }, [assetId, savedVersion]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (status !== "dirty" && operations.length === 0) return;
    saveEditorDraft({
      assetId,
      version: savedVersion + 1,
      operations,
      updatedAt: new Date().toISOString(),
    });
    if (operations.length > 0) setStatus("dirty");
  }, [operations, assetId, savedVersion, status]);

  const trim = useMemo(() => getTrimRange(operations), [operations]);
  const volume = useMemo(() => getVolumeLevel(operations), [operations]);
  const imageFilter = useMemo(() => imagePreviewFilter(operations), [operations]);

  function updateOperations(next: EditOperation[]) {
    dispatchHistory({ type: "set", operations: next });
  }

  function upsertOperation(op: EditOperation) {
    const without = operations.filter((o) => o.type !== op.type);
    updateOperations([...without, op]);
  }

  async function handleSave() {
    if (!asset || !mediaUrl) return;
    setStatus("rendering");
    setSaveError(null);
    try {
      let result;
      if (asset.mediaType === "image") {
        const blob = await renderImageToBlob(mediaUrl, operations);
        result = await saveMediaEdit(rootSourceId, operations, blob);
      } else {
        const trimOp = operations.find((o) => o.type === "trim");
        if (trimOp?.type === "trim" && duration !== null) {
          const err = validateTrim(trimOp.start, trimOp.end, duration);
          if (err) throw new Error(err);
        }
        const volOp = operations.find((o) => o.type === "volume");
        if (volOp?.type === "volume") {
          const err = validateVolume(volOp.level);
          if (err) throw new Error(err);
        }
        result = await saveMediaEdit(rootSourceId, operations);
      }
      clearEditorDraft(assetId);
      setSavedVersion((v) => v + 1);
      setStatus("saved");
      const params = new URLSearchParams();
      if (slotId) params.set("slotId", slotId);
      params.set("editedAssetId", result.asset.id);
      router.push(`${returnTo}?${params.toString()}`);
    } catch (e) {
      setStatus("failed");
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = Math.min(1, volume);
    if (audioRef.current) audioRef.current.volume = Math.min(1, volume);
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || asset?.mediaType !== "video") return;
    const onTimeUpdate = () => {
      if (trim.end !== null && video.currentTime >= trim.end) {
        video.pause();
        video.currentTime = trim.start;
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [trim, asset?.mediaType]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground" aria-live="polite">
        Loading editor…
      </div>
    );
  }

  if (loadError || !asset) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive" role="alert">{loadError}</p>
        <Link href={returnTo} className="mt-4 inline-block text-sm underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Media editor"
        description="Non-destructive edits on your generated asset."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatchHistory({ type: "undo" })}
          aria-label="Undo"
        >
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatchHistory({ type: "redo" })}
          aria-label="Redo"
        >
          Redo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            dispatchHistory({ type: "reset" });
            setStatus("draft");
          }}
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={status === "rendering"}
          onClick={() => void handleSave()}
        >
          {status === "rendering" ? "Saving…" : "Save changes"}
        </Button>
      </PageHeader>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Status: {status}
        {dirty ? " (unsaved changes)" : ""}
      </p>
      {saveError && (
        <p className="text-sm text-destructive" role="alert">{saveError}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section
          className="rounded-md border border-border/70 bg-adtraxio-surface/10 p-4"
          aria-label="Preview"
        >
          {asset.mediaType === "image" && mediaUrl && (
            <div className="relative mx-auto max-w-full overflow-hidden rounded border border-border/50">
              <img
                src={mediaUrl}
                alt="Edit preview"
                className="max-h-[60vh] w-full object-contain"
                style={{ filter: imageFilter }}
              />
              {operations
                .filter((o) => o.type === "textOverlay")
                .map((o, i) =>
                  o.type === "textOverlay" ? (
                    <span
                      key={i}
                      className="pointer-events-none absolute text-white"
                      style={{
                        left: `${o.x}%`,
                        top: `${o.y}%`,
                        fontSize: o.fontSize,
                        textAlign: o.align,
                      }}
                    >
                      {o.text}
                    </span>
                  ) : null
                )}
            </div>
          )}
          {asset.mediaType === "video" && mediaUrl && (
            <video
              ref={videoRef}
              src={mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-[60vh] w-full rounded border border-border/50 bg-black"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d)) setDuration(d);
              }}
              onError={() => setLoadError("Unable to load video metadata.")}
            />
          )}
          {asset.mediaType === "audio" && mediaUrl && (
            <audio
              ref={audioRef}
              src={mediaUrl}
              controls
              preload="metadata"
              className="w-full"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d)) setDuration(d);
              }}
              onError={() => setLoadError("Unable to load audio metadata.")}
            />
          )}
        </section>

        <aside className="space-y-4" aria-label="Edit controls">
          {asset.mediaType === "image" && (
            <>
              <StudioInput
                label="Brightness"
                id="brightness"
                type="number"
                min={0.5}
                max={2}
                step={0.05}
                value={
                  operations.find((o) => o.type === "brightness")?.type ===
                  "brightness"
                    ? String(
                        (
                          operations.find((o) => o.type === "brightness") as {
                            value: number;
                          }
                        ).value
                      )
                    : "1"
                }
                onChange={(e) =>
                  upsertOperation({
                    type: "brightness",
                    value: Number(e.target.value),
                  })
                }
              />
              <StudioInput
                label="Contrast"
                id="contrast"
                type="number"
                min={0.5}
                max={2}
                step={0.05}
                value={
                  operations.find((o) => o.type === "contrast")?.type ===
                  "contrast"
                    ? String(
                        (
                          operations.find((o) => o.type === "contrast") as {
                            value: number;
                          }
                        ).value
                      )
                    : "1"
                }
                onChange={(e) =>
                  upsertOperation({
                    type: "contrast",
                    value: Number(e.target.value),
                  })
                }
              />
              <StudioInput
                label="Crop width (px)"
                id="crop-w"
                type="number"
                min={1}
                value={String(
                  operations.find((o) => o.type === "crop")?.type === "crop"
                    ? (
                        operations.find((o) => o.type === "crop") as {
                          width: number;
                        }
                      ).width
                    : asset.width ?? 100
                )}
                onChange={(e) => {
                  const crop = operations.find((o) => o.type === "crop");
                  const width = Number(e.target.value);
                  upsertOperation({
                    type: "crop",
                    x: crop?.type === "crop" ? crop.x : 0,
                    y: crop?.type === "crop" ? crop.y : 0,
                    width,
                    height:
                      crop?.type === "crop"
                        ? crop.height
                        : asset.height ?? width,
                  });
                }}
              />
              <StudioInput
                label="Resize width (px)"
                id="resize-w"
                type="number"
                min={1}
                value={String(
                  operations.find((o) => o.type === "resize")?.type === "resize"
                    ? (
                        operations.find((o) => o.type === "resize") as {
                          width: number;
                        }
                      ).width
                    : ""
                )}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  if (!w) {
                    updateOperations(operations.filter((o) => o.type !== "resize"));
                    return;
                  }
                  upsertOperation({
                    type: "resize",
                    width: w,
                    height: Math.round(
                      (w / (asset.width ?? w)) * (asset.height ?? w)
                    ),
                  });
                }}
              />
              <label className="block text-xs text-muted-foreground">
                Aspect ratio
                <select
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                  value={
                    operations.find((o) => o.type === "aspectRatio")?.type ===
                    "aspectRatio"
                      ? (
                          operations.find((o) => o.type === "aspectRatio") as {
                            ratio: string;
                          }
                        ).ratio
                      : ""
                  }
                  onChange={(e) => {
                    if (!e.target.value) {
                      updateOperations(
                        operations.filter((o) => o.type !== "aspectRatio")
                      );
                    } else {
                      upsertOperation({
                        type: "aspectRatio",
                        ratio: e.target.value as "1:1" | "16:9" | "9:16" | "4:5",
                      });
                    }
                  }}
                >
                  <option value="">Original</option>
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="4:5">4:5</option>
                </select>
              </label>
              <StudioInput
                label="Overlay text"
                id="overlay-text"
                value={
                  operations.find((o) => o.type === "textOverlay")?.type ===
                  "textOverlay"
                    ? (
                        operations.find((o) => o.type === "textOverlay") as {
                          text: string;
                        }
                      ).text
                    : ""
                }
                onChange={(e) =>
                  upsertOperation({
                    type: "textOverlay",
                    text: e.target.value,
                    x: 10,
                    y: 10,
                    fontSize: 24,
                    align: "left",
                    color: "#ffffff",
                  })
                }
              />
            </>
          )}

          {(asset.mediaType === "video" || asset.mediaType === "audio") && (
            <>
              <StudioInput
                label="Trim start (s)"
                id="trim-start"
                type="number"
                min={0}
                step={0.1}
                value={String(trim.start)}
                onChange={(e) => {
                  const start = Number(e.target.value);
                  const end = trim.end ?? duration ?? start + 1;
                  upsertOperation({ type: "trim", start, end });
                }}
              />
              <StudioInput
                label="Trim end (s)"
                id="trim-end"
                type="number"
                min={0}
                step={0.1}
                value={String(trim.end ?? duration ?? 0)}
                onChange={(e) => {
                  const end = Number(e.target.value);
                  upsertOperation({
                    type: "trim",
                    start: trim.start,
                    end,
                  });
                }}
              />
              <StudioInput
                label="Volume"
                id="volume"
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={String(volume)}
                onChange={(e) =>
                  upsertOperation({
                    type: "volume",
                    level: Number(e.target.value),
                  })
                }
              />
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Original asset {rootSourceId} is never modified. Video and audio saves
            store an edit specification; playback applies trim and volume in the
            app until a server render path exists.
          </p>
          <Link href={returnTo} className="text-sm underline">
            Cancel
          </Link>
        </aside>
      </div>
    </div>
  );
}
