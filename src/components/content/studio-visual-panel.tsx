"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film, ImageIcon, Loader2, Mic, RefreshCw, Volume2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioOptionGroup, StudioTextarea } from "@/components/content/studio-field";
import { StudioFormSection } from "@/components/content/studio-form-section";
import { friendlyVisualErrorMessage } from "@/lib/content/visual-errors";
import {
  fetchSignedAssetUrl,
  requestImageGeneration,
  requestSoundGeneration,
  requestSpeechGeneration,
  requestVideoGeneration,
  waitForAudioJob,
  waitForImageJob,
  waitForVideoJob,
  type VisualGenerationPhase,
} from "@/lib/content/visual-client";
import {
  getActiveStudioVisualAsset,
  IMAGE_SIZE_OPTIONS,
  panelModeMatchesAsset,
  SOUND_DURATION_OPTIONS,
  VIDEO_ASPECT_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VOICE_PRESET_OPTIONS,
  type ImageSizeOption,
  type SoundDurationOption,
  type StudioPanelMode,
  type StudioVisualAssetRef,
  type StudioVisualState,
  type VideoAspectOption,
  type VideoDurationOption,
  type VoicePresetOption,
} from "@/lib/content/visual-types";
import { cn } from "@/lib/utils";

interface StudioVisualPanelProps {
  defaultPrompt: string;
  visualState: StudioVisualState;
  attachedToContent: boolean;
  disabled?: boolean;
  imageConfigured: boolean;
  videoConfigured: boolean;
  audioConfigured: boolean;
  onVisualStateChange: (state: StudioVisualState) => void;
  onAttachToContent: () => void;
  onSaveVisual: () => void;
}

const MEDIA_TYPE_OPTIONS: { id: StudioPanelMode; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "voice", label: "Voice" },
  { id: "sound", label: "Sound" },
];

export function StudioVisualPanel({
  defaultPrompt,
  visualState,
  attachedToContent,
  disabled,
  imageConfigured,
  videoConfigured,
  audioConfigured,
  onVisualStateChange,
  onAttachToContent,
  onSaveVisual,
}: StudioVisualPanelProps) {
  const [mediaMode, setMediaMode] = useState<StudioPanelMode>(
    visualState.activeMediaType ?? "image"
  );
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [size, setSize] = useState<ImageSizeOption>("1024x1024");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectOption>("16:9");
  const [duration, setDuration] = useState<VideoDurationOption>("8");
  const [voiceId, setVoiceId] = useState<VoicePresetOption>(
    VOICE_PRESET_OPTIONS[0].id
  );
  const [soundDuration, setSoundDuration] = useState<SoundDurationOption>("3");
  const [phase, setPhase] = useState<VisualGenerationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const activeRequestRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const activeAsset = useMemo(
    () => getActiveStudioVisualAsset(visualState),
    [visualState]
  );

  const modeConfigured =
    mediaMode === "image"
      ? imageConfigured
      : mediaMode === "video"
        ? videoConfigured
        : audioConfigured;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setPrompt((prev) => (prev.trim() ? prev : defaultPrompt));
  }, [defaultPrompt]);

  useEffect(() => {
    if (visualState.activeMediaType) {
      setMediaMode(visualState.activeMediaType);
    }
  }, [visualState.activeMediaType]);

  const loadPreview = useCallback(async (assetId: string) => {
    const url = await fetchSignedAssetUrl(assetId);
    if (mountedRef.current) {
      setPreviewUrl(url);
    }
    return url;
  }, []);

  useEffect(() => {
    if (
      visualState.activeAssetId &&
      activeAsset &&
      panelModeMatchesAsset(mediaMode, activeAsset)
    ) {
      void loadPreview(visualState.activeAssetId);
    } else if (
      !visualState.activeAssetId ||
      !activeAsset ||
      !panelModeMatchesAsset(mediaMode, activeAsset)
    ) {
      setPreviewUrl(null);
    }
  }, [visualState.activeAssetId, activeAsset, mediaMode, loadPreview]);

  function switchMediaMode(mode: StudioPanelMode) {
    if (phase === "generating" || phase === "processing") return;
    setMediaMode(mode);
    setError(null);
    setPhase("idle");
    onVisualStateChange({ ...visualState, activeMediaType: mode });
  }

  function buildAssetEntry(
    assetId: string,
    finalPrompt: string
  ): StudioVisualAssetRef {
    if (mediaMode === "image") {
      return {
        assetId,
        prompt: finalPrompt,
        type: "image",
        size,
        createdAt: new Date().toISOString(),
      };
    }
    if (mediaMode === "video") {
      return {
        assetId,
        prompt: finalPrompt,
        type: "video",
        aspectRatio,
        durationSeconds: Number(duration),
        createdAt: new Date().toISOString(),
      };
    }
    if (mediaMode === "voice") {
      return {
        assetId,
        prompt: finalPrompt,
        type: "audio",
        audioSubtype: "voice",
        voiceId,
        createdAt: new Date().toISOString(),
      };
    }
    return {
      assetId,
      prompt: finalPrompt,
      type: "audio",
      audioSubtype: "sound",
      durationSeconds: Number(soundDuration),
      createdAt: new Date().toISOString(),
    };
  }

  async function runGeneration(options?: {
    variation?: boolean;
    edit?: boolean;
  }) {
    if (activeRequestRef.current || disabled || !modeConfigured) return;

    const trimmed = prompt.trim();
    if (!trimmed) {
      setError(
        mediaMode === "voice"
          ? "Enter a script for your voiceover."
          : mediaMode === "sound"
            ? "Describe the sound you want."
            : mediaMode === "video"
              ? "Describe the video you want to create."
              : "Describe the visual you want to create."
      );
      return;
    }

    let finalPrompt = trimmed;
    if (options?.edit && editInstruction.trim()) {
      finalPrompt = `${trimmed}. ${editInstruction.trim()}`;
    } else if (options?.variation && activeAsset?.prompt) {
      finalPrompt = `${activeAsset.prompt}. Variation: ${trimmed}`;
    }

    activeRequestRef.current = true;
    pollAbortRef.current?.abort();
    const abort = new AbortController();
    pollAbortRef.current = abort;

    setPhase("generating");
    setError(null);
    setShowEdit(false);

    const idempotencyKey = `media-${mediaMode}-${crypto.randomUUID()}`;

    try {
      const started =
        mediaMode === "image"
          ? await requestImageGeneration({
              prompt: finalPrompt,
              size,
              idempotencyKey,
            })
          : mediaMode === "video"
            ? await requestVideoGeneration({
                prompt: finalPrompt,
                aspectRatio,
                durationSeconds: Number(duration),
                idempotencyKey,
              })
            : mediaMode === "voice"
              ? await requestSpeechGeneration({
                  text: finalPrompt,
                  voiceId,
                  idempotencyKey,
                })
              : await requestSoundGeneration({
                  text: finalPrompt,
                  durationSeconds: Number(soundDuration),
                  idempotencyKey,
                });

      if ("error" in started) {
        if (mountedRef.current) {
          setPhase("failed");
          setError(
            friendlyVisualErrorMessage(started.error, started.category)
          );
        }
        return;
      }

      const onStatus = (status: string) => {
        if (!mountedRef.current) return;
        if (status === "processing") {
          setPhase("processing");
        }
      };

      const finished =
        mediaMode === "image"
          ? await waitForImageJob(started.job.id, { signal: abort.signal })
          : mediaMode === "video"
            ? await waitForVideoJob(started.job.id, {
                signal: abort.signal,
                onStatus,
              })
            : await waitForAudioJob(started.job.id, {
                signal: abort.signal,
                onStatus,
                timeoutMessage:
                  mediaMode === "voice"
                    ? "Voiceover creation is taking longer than expected. Try again."
                    : "Sound creation is taking longer than expected. Try again.",
              });

      if ("error" in finished) {
        if (mountedRef.current) {
          setPhase("failed");
          setError(
            friendlyVisualErrorMessage(finished.error, finished.category)
          );
        }
        return;
      }

      const nextState: StudioVisualState = {
        activeAssetId: finished.assetId,
        activeMediaType: mediaMode,
        assets: [
          ...visualState.assets.filter((a) => a.assetId !== finished.assetId),
          buildAssetEntry(finished.assetId, finalPrompt),
        ],
      };

      if (mountedRef.current) {
        onVisualStateChange(nextState);
        setPhase("completed");
        await loadPreview(finished.assetId);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (mountedRef.current) {
        setPhase("failed");
        setError(friendlyVisualErrorMessage(null));
      }
    } finally {
      activeRequestRef.current = false;
    }
  }

  const generating = phase === "generating" || phase === "processing";
  const showPreview =
    previewUrl &&
    !generating &&
    activeAsset &&
    panelModeMatchesAsset(mediaMode, activeAsset);

  const statusMessage = useMemo(() => {
    if (phase === "processing") {
      return mediaMode === "voice" || mediaMode === "sound"
        ? "Processing your audio…"
        : "Processing your video…";
    }
    if (mediaMode === "voice") return "Creating your voiceover…";
    if (mediaMode === "sound") return "Creating your sound…";
    if (mediaMode === "video") return "Creating your video…";
    return "Creating your visual…";
  }, [phase, mediaMode]);

  const generateLabel =
    mediaMode === "voice"
      ? "Generate voiceover"
      : mediaMode === "sound"
        ? "Generate sound"
        : mediaMode === "video"
          ? "Generate video"
          : "Create visual";

  const notConfiguredMessage =
    mediaMode === "video"
      ? "Video generation is not configured for this environment yet."
      : mediaMode === "voice" || mediaMode === "sound"
        ? "Audio generation is not configured for this environment yet."
        : "Image generation is not configured for this environment yet.";

  return (
    <section
      className="rounded-md border border-border/70 bg-adtraxio-surface/10"
      aria-labelledby="studio-visual-heading"
    >
      <div className="flex flex-col gap-1 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          <h2
            id="studio-visual-heading"
            className="font-heading text-sm font-medium text-foreground"
          >
            Media
          </h2>
        </div>
        {attachedToContent && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-adtraxio-accent">
            Used in preview
          </span>
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <StudioOptionGroup
          label="Type"
          options={MEDIA_TYPE_OPTIONS}
          value={mediaMode}
          onChange={(value) => switchMediaMode(value as StudioPanelMode)}
        />

        {!modeConfigured && (
          <p className="text-sm text-muted-foreground" role="status">
            {notConfiguredMessage}
          </p>
        )}

        {phase === "idle" && !showPreview && (
          <p className="text-sm text-muted-foreground">
            Generated files are saved privately to your workspace.
          </p>
        )}

        <StudioFormSection
          title={
            mediaMode === "voice"
              ? "Script"
              : mediaMode === "sound"
                ? "Sound description"
                : mediaMode === "video"
                  ? "Video direction"
                  : "Describe your visual"
          }
        >
          <StudioTextarea
            label={mediaMode === "voice" ? "Voiceover text" : "Prompt"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mediaMode === "voice"
                ? "e.g. Discover a calmer morning routine with our skincare line."
                : mediaMode === "sound"
                  ? "e.g. Short camera shutter sound"
                  : mediaMode === "video"
                    ? "e.g. Slow pan over a product on marble, soft studio light"
                    : "e.g. Minimal product hero on soft gradient, editorial lighting"
            }
            rows={4}
            disabled={generating || disabled || !modeConfigured}
          />
        </StudioFormSection>

        {mediaMode === "image" && (
          <StudioFormSection title="Format">
            <StudioOptionGroup
              label="Aspect ratio"
              options={IMAGE_SIZE_OPTIONS.map((opt) => ({
                id: opt.id,
                label: `${opt.label} (${opt.description})`,
              }))}
              value={size}
              onChange={(value) => setSize(value as ImageSizeOption)}
            />
          </StudioFormSection>
        )}

        {mediaMode === "video" && (
          <>
            <StudioFormSection title="Format">
              <StudioOptionGroup
                label="Aspect ratio"
                options={VIDEO_ASPECT_OPTIONS.map((opt) => ({
                  id: opt.id,
                  label: `${opt.label} (${opt.description})`,
                }))}
                value={aspectRatio}
                onChange={(value) => setAspectRatio(value as VideoAspectOption)}
              />
            </StudioFormSection>
            <StudioFormSection title="Length">
              <StudioOptionGroup
                label="Duration"
                options={VIDEO_DURATION_OPTIONS.map((opt) => ({
                  id: opt.id,
                  label: opt.label,
                }))}
                value={duration}
                onChange={(value) => setDuration(value as VideoDurationOption)}
              />
            </StudioFormSection>
          </>
        )}

        {mediaMode === "voice" && (
          <StudioFormSection title="Voice">
            <StudioOptionGroup
              label="Narrator"
              options={VOICE_PRESET_OPTIONS.map((opt) => ({
                id: opt.id,
                label: opt.label,
              }))}
              value={voiceId}
              onChange={(value) => setVoiceId(value as VoicePresetOption)}
            />
          </StudioFormSection>
        )}

        {mediaMode === "sound" && (
          <StudioFormSection title="Length">
            <StudioOptionGroup
              label="Duration"
              options={SOUND_DURATION_OPTIONS.map((opt) => ({
                id: opt.id,
                label: opt.label,
              }))}
              value={soundDuration}
              onChange={(value) =>
                setSoundDuration(value as SoundDurationOption)
              }
            />
          </StudioFormSection>
        )}

        {showEdit && (
          <StudioFormSection title="Adjust with new text">
            <p className="mb-2 text-xs text-muted-foreground">
              Text-based regeneration only — not timeline or audio editing.
            </p>
            <StudioTextarea
              label="What should change?"
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              placeholder="e.g. Shorter script, warmer tone in wording"
              rows={2}
              disabled={generating || disabled}
            />
          </StudioFormSection>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={generating || disabled || !modeConfigured}
            onClick={() => void runGeneration()}
          >
            {generating ? (
              <>
                <Loader2
                  className={cn(
                    "mr-1.5 size-3.5",
                    !prefersReducedMotion && "animate-spin"
                  )}
                  aria-hidden
                />
                {statusMessage}
              </>
            ) : showPreview ? (
              <>
                <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
                Try again
              </>
            ) : (
              <>
                {mediaMode === "video" && (
                  <Film className="mr-1.5 size-3.5" aria-hidden />
                )}
                {mediaMode === "voice" && (
                  <Mic className="mr-1.5 size-3.5" aria-hidden />
                )}
                {mediaMode === "sound" && (
                  <Volume2 className="mr-1.5 size-3.5" aria-hidden />
                )}
                {generateLabel}
              </>
            )}
          </Button>

          {showPreview && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => void runGeneration({ variation: true })}
              >
                <Wand2 className="mr-1.5 size-3.5" aria-hidden />
                Generate variation
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => setShowEdit((v) => !v)}
              >
                Edit text
              </Button>
              {showEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || !editInstruction.trim()}
                  onClick={() => void runGeneration({ edit: true })}
                >
                  Regenerate
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={onAttachToContent}
              >
                Use for content
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={onSaveVisual}
              >
                Save
              </Button>
            </>
          )}
        </div>

        {generating && (
          <div
            className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/20"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          </div>
        )}

        {error && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground"
            role="alert"
          >
            <p>{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                setPhase("idle");
                setError(null);
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {showPreview && mediaMode === "image" && (
          <figure className="overflow-hidden rounded-md border border-border/60 bg-background">
            <img
              src={previewUrl}
              alt="Generated visual for your content"
              className="max-h-[min(70vh,520px)] w-full object-contain"
              onError={() => {
                if (visualState.activeAssetId) {
                  void loadPreview(visualState.activeAssetId);
                }
              }}
            />
          </figure>
        )}

        {showPreview && mediaMode === "video" && (
          <figure className="overflow-hidden rounded-md border border-border/60 bg-background">
            <video
              key={previewUrl}
              src={previewUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-[min(70vh,520px)] w-full bg-black object-contain"
              aria-label="Generated video preview"
              onError={() => {
                if (visualState.activeAssetId) {
                  void loadPreview(visualState.activeAssetId);
                }
              }}
            />
          </figure>
        )}

        {showPreview && (mediaMode === "voice" || mediaMode === "sound") && (
          <figure className="rounded-md border border-border/60 bg-background p-3">
            <audio
              key={previewUrl}
              src={previewUrl}
              controls
              preload="metadata"
              className="w-full"
              aria-label={
                mediaMode === "voice"
                  ? "Generated voiceover preview"
                  : "Generated sound preview"
              }
              onError={() => {
                if (visualState.activeAssetId) {
                  void loadPreview(visualState.activeAssetId);
                }
              }}
            />
          </figure>
        )}
      </div>
    </section>
  );
}
