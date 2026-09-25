"use client";

import { Button } from "@/components/ui/button";
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
    <div className="flex h-full min-h-[520px] flex-col lg:min-h-[640px]">
      <div className="border-b border-border/60 pb-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Creative Brief
        </p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
          Define what you&apos;re creating
        </h2>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto py-6 pr-1">
        <StudioOptionGroup
          label="Content type"
          options={CONTENT_TYPES}
          value={brief.contentType}
          onChange={(value) => onChange({ contentType: value })}
        />

        <StudioOptionGroup
          label="Goal"
          options={CONTENT_GOALS}
          value={brief.goal}
          onChange={(value) => onChange({ goal: value })}
        />

        <StudioOptionGroup
          label="Platform"
          options={CONTENT_PLATFORMS}
          value={brief.platform}
          onChange={(value) => onChange({ platform: value })}
        />

        <StudioInput
          label="Audience"
          value={brief.audience}
          onChange={(e) => onChange({ audience: e.target.value })}
          error={errors.audience}
          placeholder="e.g. Small business owners aged 25–45"
        />

        <StudioOptionGroup
          label="Tone"
          options={CONTENT_TONES}
          value={brief.tone}
          onChange={(value) => onChange({ tone: value })}
        />

        <StudioTextarea
          label="Topic / offer"
          value={brief.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          error={errors.topic}
          placeholder="What are you promoting? Include the offer, product, or message."
          className="min-h-[140px]"
        />

        <StudioTextarea
          label="Additional context"
          optional
          value={brief.additionalContext}
          onChange={(e) => onChange({ additionalContext: e.target.value })}
          placeholder="Constraints, brand notes, or angles to emphasize."
          className="min-h-[100px]"
        />

        <StudioInput
          label="CTA"
          optional
          value={brief.cta}
          onChange={(e) => onChange({ cta: e.target.value })}
          placeholder="e.g. Shop now, Book a demo"
        />

        {aiNotConfigured && (
          <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            AI generation is not configured yet. Add{" "}
            <code className="text-amber-100">OPENAI_API_KEY</code> to your
            server environment.
          </p>
        )}
      </div>

      <div className="border-t border-border/60 pt-5">
        <Button
          type="button"
          size="cta"
          className="w-full bg-adtraxio-accent hover:bg-adtraxio-accent/90"
          disabled={generating || aiNotConfigured}
          onClick={onGenerate}
        >
          {generating ? "Generating…" : "Generate content"}
        </Button>
      </div>
    </div>
  );
}
