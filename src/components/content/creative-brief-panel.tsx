"use client";

import { Button } from "@/components/ui/button";
import { StudioFormSection } from "@/components/content/studio-form-section";
import {
  StudioInput,
  StudioOptionGroup,
  StudioTextarea,
} from "@/components/content/studio-field";
import {
  CONTENT_GOALS,
  CONTENT_PLATFORMS,
  CONTENT_TONES,
  CONTENT_TYPES,
} from "@/lib/content/constants";
import type { CreativeBrief } from "@/lib/content/types";

interface CreativeBriefPanelProps {
  brief: CreativeBrief;
  errors: Record<string, string>;
  generating: boolean;
  aiNotConfigured: boolean;
  onChange: (updates: Partial<CreativeBrief>) => void;
  onGenerate: () => void;
}

export function CreativeBriefPanel({
  brief,
  errors,
  generating,
  aiNotConfigured,
  onChange,
  onGenerate,
}: CreativeBriefPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/50 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Brief
        </p>
        <h2 className="mt-1 font-heading text-lg tracking-tight text-foreground">
          What you&apos;re creating
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Platform, goal, and message — ADTRAXIO structures the creative from
          here.
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto py-5 pr-1">
        <StudioFormSection title="Content">
          <StudioOptionGroup
            label="Content type"
            options={CONTENT_TYPES}
            value={brief.contentType}
            onChange={(value) => onChange({ contentType: value })}
            compact
          />
          <StudioOptionGroup
            label="Platform"
            options={CONTENT_PLATFORMS}
            value={brief.platform}
            onChange={(value) => onChange({ platform: value })}
            compact
          />
        </StudioFormSection>

        <StudioFormSection title="Goal" description="What success looks like">
          <StudioOptionGroup
            label="Objective"
            options={CONTENT_GOALS}
            value={brief.goal}
            onChange={(value) => onChange({ goal: value })}
            compact
          />
        </StudioFormSection>

        <StudioFormSection title="Audience">
          <StudioInput
            label="Who this is for"
            value={brief.audience}
            onChange={(e) => onChange({ audience: e.target.value })}
            error={errors.audience}
            placeholder="e.g. Small business owners aged 25–45"
          />
        </StudioFormSection>

        <StudioFormSection title="Brand & voice">
          <StudioOptionGroup
            label="Tone"
            options={CONTENT_TONES}
            value={brief.tone}
            onChange={(value) => onChange({ tone: value })}
            compact
          />
          <StudioInput
            label="CTA"
            optional
            value={brief.cta}
            onChange={(e) => onChange({ cta: e.target.value })}
            placeholder="e.g. Shop now, Book a demo"
          />
        </StudioFormSection>

        <StudioFormSection title="Message">
          <StudioTextarea
            label="Topic / offer"
            value={brief.topic}
            onChange={(e) => onChange({ topic: e.target.value })}
            error={errors.topic}
            placeholder="What are you promoting? Include the offer, product, or message."
            className="min-h-[120px]"
          />
          <StudioTextarea
            label="Additional context"
            optional
            value={brief.additionalContext}
            onChange={(e) => onChange({ additionalContext: e.target.value })}
            placeholder="Constraints, brand notes, or angles to emphasize."
            className="min-h-[88px]"
          />
        </StudioFormSection>

        {aiNotConfigured && (
          <p className="rounded-md border border-border/70 bg-adtraxio-surface/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Generation is unavailable until AI is configured for this
            environment. You can still save and manage drafts.
          </p>
        )}
      </div>

      <div className="border-t border-border/50 pt-4">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={generating || aiNotConfigured}
          onClick={onGenerate}
        >
          {generating ? "Generating content…" : "Generate content"}
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Brief → generate → review → refine → save
        </p>
      </div>
    </div>
  );
}
