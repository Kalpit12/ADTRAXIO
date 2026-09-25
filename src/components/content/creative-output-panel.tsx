"use client";

import { Copy, RefreshCw, Save, Send, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutputFieldPlaceholders } from "@/components/content/output-field-placeholders";
import { StudioInput, StudioTextarea } from "@/components/content/studio-field";
import { hashtagsToText } from "@/lib/content/validation";
import type { GeneratedCreative } from "@/lib/content/types";
import { cn } from "@/lib/utils";

interface CreativeOutputPanelProps {
  versions: GeneratedCreative[];
  activeVersionIndex: number;
  generating: boolean;
  saving: boolean;
  saveMessage: string | null;
  copyMessage: string | null;
  generationError: string | null;
  onSelectVersion: (index: number) => void;
  onCreativeChange: (creative: GeneratedCreative) => void;
  onRegenerate: () => void;
  onCreateVariation: () => void;
  onSaveDraft: () => void;
  onCopy: () => void;
  onPublish?: () => void;
  canPublish?: boolean;
}

export function CreativeOutputPanel({
  versions,
  activeVersionIndex,
  generating,
  saving,
  saveMessage,
  copyMessage,
  generationError,
  onSelectVersion,
  onCreativeChange,
  onRegenerate,
  onCreateVariation,
  onSaveDraft,
  onCopy,
  onPublish,
  canPublish = false,
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
    <div className="flex h-full min-h-[520px] flex-col lg:min-h-[640px]">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            Creative Output
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
            Review and refine
          </h2>
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
              Create variation
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
              className="bg-adtraxio-accent hover:bg-adtraxio-accent/90"
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

      {versions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-border/60 py-3">
          {versions.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelectVersion(index)}
              className={cn(
                "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                index === activeVersionIndex
                  ? "border-adtraxio-accent/40 bg-adtraxio-accent/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              Version {index + 1}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-6 pr-1">
        {generationError && (
          <p
            className="mb-5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {generationError}
          </p>
        )}

        {!hasOutput && (
          <div className="mb-6 max-w-lg">
            <p className="text-base font-medium text-foreground">
              Your creative workspace is ready.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Complete the brief and generate your first creative.
            </p>
            {generating && (
              <div className="mt-4 flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="size-4 animate-pulse rounded-full bg-secondary" />
                Generating your creative…
              </div>
            )}
          </div>
        )}

        {hasOutput && creative ? (
          <div className="space-y-6">
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
              className="min-h-[120px]"
            />
            <StudioInput
              label="CTA"
              value={creative.cta}
              onChange={(e) => updateField("cta", e.target.value)}
            />
            <StudioTextarea
              label="Caption"
              value={creative.caption}
              onChange={(e) => updateField("caption", e.target.value)}
              className="min-h-[120px]"
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
              className="min-h-[72px]"
            />
            <StudioTextarea
              label="Creative direction"
              value={creative.creativeDirection}
              onChange={(e) =>
                updateField("creativeDirection", e.target.value)
              }
              className="min-h-[96px]"
            />
          </div>
        ) : (
          <>
            <div className="mb-5 border-t border-border/60" />
            <OutputFieldPlaceholders dimmed={generating} />
          </>
        )}
      </div>

      {(saveMessage || copyMessage) && (
        <div className="border-t border-border/60 pt-3">
          {saveMessage && (
            <p className="text-xs text-adtraxio-accent">{saveMessage}</p>
          )}
          {copyMessage && (
            <p className="text-xs text-muted-foreground">{copyMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
