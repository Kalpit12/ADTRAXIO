"use client";

import { Copy, RefreshCw, Save, Send, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentPreview } from "@/components/content/content-preview";
import { ContentStudioError } from "@/components/content/content-studio-error";
import { GenerationSkeleton } from "@/components/content/generation-skeleton";
import { OutputFieldPlaceholders } from "@/components/content/output-field-placeholders";
import { StudioInput, StudioTextarea } from "@/components/content/studio-field";
import { VariationSelector } from "@/components/content/variation-selector";
import { hashtagsToText } from "@/lib/content/validation";
import type { ContentPlatform, ContentType, GeneratedCreative } from "@/lib/content/types";
import { cn } from "@/lib/utils";

export type CreativeReviewStatus = "empty" | "generated" | "edited" | "saved";

interface CreativeOutputPanelProps {
  versions: GeneratedCreative[];
  activeVersionIndex: number;
  platform: ContentPlatform;
  contentType: ContentType;
  generating: boolean;
  saving: boolean;
  saveMessage: string | null;
  copyMessage: string | null;
  generationError: string | null;
  aiNotConfigured?: boolean;
  reviewStatus: CreativeReviewStatus;
  onSelectVersion: (index: number) => void;
  onCreativeChange: (creative: GeneratedCreative) => void;
  onRegenerate: () => void;
  onCreateVariation: () => void;
  onSaveDraft: () => void;
  onCopy: () => void;
  onPublish?: () => void;
  canPublish?: boolean;
  onRetryGenerate?: () => void;
  previewVisualUrl?: string | null;
  previewVisualType?: "image" | "video" | "audio";
}

function StatusBadge({ status }: { status: CreativeReviewStatus }) {
  if (status === "empty") return null;

  const label =
    status === "saved"
      ? "Saved draft"
      : status === "edited"
        ? "Edited"
        : "Generated";

  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        status === "edited" && "border-adtraxio-accent/30 text-foreground",
        status === "generated" && "border-border/70 text-muted-foreground",
        status === "saved" && "border-adtraxio-accent/25 text-foreground"
      )}
    >
      {label}
    </span>
  );
}

export function CreativeOutputPanel({
  versions,
  activeVersionIndex,
  platform,
  contentType,
  generating,
  saving,
  saveMessage,
  copyMessage,
  generationError,
  aiNotConfigured,
  reviewStatus,
  onSelectVersion,
  onCreativeChange,
  onRegenerate,
  onCreateVariation,
  onSaveDraft,
  onCopy,
  onPublish,
  canPublish = false,
  onRetryGenerate,
  previewVisualUrl,
  previewVisualType = "image",
}: CreativeOutputPanelProps) {
  const creative = versions[activeVersionIndex];
  const hasOutput = Boolean(creative);

  function updateField<K extends keyof GeneratedCreative>(
    key: K,
    value: GeneratedCreative[K]
  ) {
    if (!creative) return;
    onCreativeChange({ ...creative, [key]: value });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Output
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg tracking-tight text-foreground">
              Creative result
            </h2>
            <StatusBadge status={reviewStatus} />
          </div>
        </div>

        {hasOutput && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={onRegenerate}
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={onCreateVariation}
            >
              <Shuffle className="size-3.5" />
              Variation
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={onCopy}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || generating}
              onClick={onSaveDraft}
            >
              <Save className="size-3.5" />
              {saving ? "Saving…" : "Save draft"}
            </Button>
            {onPublish && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canPublish || saving || generating}
                onClick={onPublish}
              >
                <Send className="size-3.5" />
                Publish
              </Button>
            )}
          </div>
        )}
      </div>

      <VariationSelector
        count={versions.length}
        activeIndex={activeVersionIndex}
        onSelect={onSelectVersion}
      />

      <div className="flex-1 overflow-y-auto py-5 pr-1">
        {generationError && (
          <div className="mb-5">
            <ContentStudioError
              message={generationError}
              aiNotConfigured={aiNotConfigured}
              onRetry={onRetryGenerate}
            />
          </div>
        )}

        {generating && !hasOutput && <GenerationSkeleton />}

        {!hasOutput && !generating && (
          <div className="mb-6 max-w-lg space-y-3">
            <p className="font-heading text-lg tracking-tight text-foreground">
              Start with a brief
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Complete the brief on the left, then generate platform-ready copy:
              hook, headline, body, CTA, caption, hashtags, and creative
              direction.
            </p>
            <OutputFieldPlaceholders />
          </div>
        )}

        {hasOutput && creative && (
          <div className="space-y-8">
            <ContentPreview
              creative={creative}
              platform={platform}
              contentType={contentType}
              visualUrl={previewVisualUrl}
              visualType={previewVisualType}
            />

            <div className="space-y-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Refine fields
              </p>

              <div className="space-y-4 rounded-md border border-border/50 bg-adtraxio-surface/10 p-4">
                <p className="text-xs font-medium text-foreground/90">
                  Lead creative
                </p>
                <StudioInput
                  label="Hook"
                  value={creative.hook}
                  onChange={(e) => updateField("hook", e.target.value)}
                />
                <StudioInput
                  label="Headline"
                  value={creative.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                />
                <StudioTextarea
                  label="Primary copy"
                  value={creative.primaryCopy}
                  onChange={(e) => updateField("primaryCopy", e.target.value)}
                  className="min-h-[100px]"
                />
                <StudioInput
                  label="CTA"
                  value={creative.cta}
                  onChange={(e) => updateField("cta", e.target.value)}
                />
              </div>

              <div className="space-y-4 rounded-md border border-border/40 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Platform copy
                </p>
                <StudioTextarea
                  label="Caption"
                  value={creative.caption}
                  onChange={(e) => updateField("caption", e.target.value)}
                  className="min-h-[96px]"
                />
                <StudioTextarea
                  label="Hashtags"
                  value={hashtagsToText(creative.hashtags)}
                  onChange={(e) =>
                    updateField(
                      "hashtags",
                      e.target.value
                        .split(/[\s,]+/)
                        .map((tag) => tag.trim().replace(/^#/, ""))
                        .filter(Boolean)
                    )
                  }
                  className="min-h-[64px]"
                />
              </div>

              <StudioTextarea
                label="Creative direction"
                value={creative.creativeDirection}
                onChange={(e) =>
                  updateField("creativeDirection", e.target.value)
                }
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}
      </div>

      {(saveMessage || copyMessage) && (
        <div className="border-t border-border/50 pt-3" role="status">
          {saveMessage && (
            <p className="text-sm text-foreground/90">{saveMessage}</p>
          )}
          {copyMessage && (
            <p className="text-xs text-muted-foreground">{copyMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
