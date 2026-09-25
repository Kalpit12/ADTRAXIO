"use client";

import { useCallback, useEffect, useState } from "react";
import { CreativeBriefPanel } from "@/components/content/creative-brief-panel";
import { CreativeOutputPanel } from "@/components/content/creative-output-panel";
import { RecentDrafts } from "@/components/content/recent-drafts";
import { CampaignSelect } from "@/components/content/campaign-select";
import { ContentApprovalPanel } from "@/components/collaboration/content-approval-panel";
import { PublishPanel } from "@/components/publishing/publish-panel";
import { getDraft, listRecentDrafts, saveDraft } from "@/lib/content/service";
import {
  defaultCreativeBrief,
  type ContentDraftSummary,
  type CreativeBrief,
  type GeneratedCreative,
} from "@/lib/content/types";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { validateCreativeBrief } from "@/lib/content/validation";

export function ContentStudioView() {
  const [brief, setBrief] = useState<CreativeBrief>(defaultCreativeBrief());
  const [briefErrors, setBriefErrors] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<GeneratedCreative[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<ContentDraftSummary[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [aiNotConfigured, setAiNotConfigured] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const activeCreative = versions[activeVersionIndex];

  const refreshDrafts = useCallback(async () => {
    const result = await listRecentDrafts();
    if (result.data) {
      setRecentDrafts(result.data);
    }
    setDraftsLoading(false);
  }, []);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    fetch("/api/ai/generate-content")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        setAiNotConfigured(data.configured === false);
      })
      .catch(() => {
        setAiNotConfigured(false);
      });
  }, []);

  async function runGeneration(options?: { variationOf?: GeneratedCreative }) {
    const errors = validateCreativeBrief(brief);
    setBriefErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setGenerating(true);
    setGenerationError(null);
    setSaveMessage(null);
    setCopyMessage(null);

    try {
      const response = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          variationOf: options?.variationOf,
        }),
      });

      const payload = (await response.json()) as {
        creative?: GeneratedCreative;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (payload.code === "AI_NOT_CONFIGURED") {
          setAiNotConfigured(true);
        }
        setGenerationError(payload.error ?? "Unable to generate content.");
        return;
      }

      if (!payload.creative) {
        setGenerationError("AI returned an invalid response.");
        return;
      }

      setAiNotConfigured(false);

      if (options?.variationOf) {
        setVersions((prev) => [...prev, payload.creative!]);
        setActiveVersionIndex((prev) => prev + 1);
      } else {
        setVersions([payload.creative]);
        setActiveVersionIndex(0);
      }
    } catch {
      setGenerationError("Unable to reach the generation service.");
    } finally {
      setGenerating(false);
    }
  }

  function handleBriefChange(updates: Partial<CreativeBrief>) {
    setBrief((prev) => ({ ...prev, ...updates }));
    setBriefErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(updates)) {
        delete next[key];
      }
      return next;
    });
  }

  function handleCreativeChange(creative: GeneratedCreative) {
    setVersions((prev) =>
      prev.map((item, index) =>
        index === activeVersionIndex ? creative : item
      )
    );
  }

  async function handleSaveDraft() {
    if (!activeCreative) return;

    setSaving(true);
    setSaveMessage(null);

    const result = await saveDraft({
      id: draftId ?? undefined,
      brief,
      creative: activeCreative,
      status: "draft",
    });

    setSaving(false);

    if (result.error) {
      setGenerationError(result.error);
      return;
    }

    if (result.data) {
      setDraftId(result.data.id);

      if (selectedCampaignId) {
        try {
          const attachRes = await fetch(
            `/api/campaigns/${selectedCampaignId}/content`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contentId: result.data.id }),
            }
          );
          if (attachRes.ok) {
            setSaveMessage("Draft saved and added to campaign.");
          } else {
            setSaveMessage("Draft saved.");
          }
        } catch {
          setSaveMessage("Draft saved.");
        }
      } else {
        setSaveMessage("Draft saved.");
      }

      await refreshDrafts();
    }
  }

  async function handleLoadDraft(id: string) {
    const result = await getDraft(id);
    if (result.error || !result.data) {
      setGenerationError(result.error ?? "Unable to load draft.");
      return;
    }

    setBrief(result.data.brief);
    setVersions([result.data.creative]);
    setActiveVersionIndex(0);
    setDraftId(result.data.id);
    setBriefErrors({});
    setGenerationError(null);
    setSaveMessage(null);
    setCopyMessage(null);
  }

  function buildPublishCaption(creative: GeneratedCreative): string {
    const hashtags = creative.hashtags
      .map((tag) => `#${tag.replace(/^#/, "")}`)
      .join(" ");

    return [creative.caption.trim(), creative.primaryCopy.trim(), hashtags.trim()]
      .filter(Boolean)
      .join("\n\n");
  }

  async function handleOpenPublish() {
    if (!activeCreative) return;

    if (!draftId || draftId.startsWith("local-")) {
      setSaving(true);
      const result = await saveDraft({
        id: draftId ?? undefined,
        brief,
        creative: activeCreative,
        status: "draft",
      });
      setSaving(false);

      if (result.error || !result.data) {
        setGenerationError(result.error ?? "Save the draft before publishing.");
        return;
      }

      setDraftId(result.data.id);
      await refreshDrafts();
    }

    setPublishOpen(true);
    setPublishMessage(null);
  }

  async function handleCopy() {
    if (!activeCreative) return;

    const text = [
      `Hook: ${activeCreative.hook}`,
      `Headline: ${activeCreative.headline}`,
      "",
      activeCreative.primaryCopy,
      "",
      `CTA: ${activeCreative.cta}`,
      "",
      activeCreative.caption,
      "",
      activeCreative.hashtags.map((tag) => `#${tag}`).join(" "),
      "",
      `Creative direction: ${activeCreative.creativeDirection}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied to clipboard.");
    } catch {
      setCopyMessage("Unable to copy. Select and copy manually.");
    }
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Create</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
          Content Studio
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Brief your creative, generate advertising copy, refine it, and save
          drafts for your next campaign.
        </p>
        <AskAdtraxioLink
          variant="button"
          className="mt-4"
          label="Improve with ADTRAXIO AI"
          prompt={
            activeCreative
              ? `Improve this content draft for ${brief.platform}:\nHook: ${activeCreative.hook}\nHeadline: ${activeCreative.headline}\nPrimary copy: ${activeCreative.primaryCopy}\nCTA: ${activeCreative.cta}`
              : "Help me create stronger content based on my top-performing posts and current brief."
          }
        />
        <p className="mt-3 text-xs text-muted-foreground/80">
          Connect a social account to publish your content later.{" "}
          <a
            href="/social"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Manage connections
          </a>
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(300px,38%)_minmax(0,62%)] lg:gap-0 lg:divide-x lg:divide-border/60">
        <div className="lg:pr-10">
          <CreativeBriefPanel
            brief={brief}
            errors={briefErrors}
            generating={generating}
            aiNotConfigured={aiNotConfigured}
            onChange={handleBriefChange}
            onGenerate={() => runGeneration()}
          />
        </div>

        <div className="lg:pl-10">
          <div className="mb-6 max-w-sm">
            <CampaignSelect
              value={selectedCampaignId}
              onChange={setSelectedCampaignId}
              disabled={saving || generating}
            />
          </div>

          <CreativeOutputPanel
            versions={versions}
            activeVersionIndex={activeVersionIndex}
            generating={generating}
            saving={saving}
            saveMessage={saveMessage}
            copyMessage={copyMessage}
            generationError={generationError}
            onSelectVersion={setActiveVersionIndex}
            onCreativeChange={handleCreativeChange}
            onRegenerate={() => runGeneration()}
            onCreateVariation={() => {
              if (activeCreative) {
                runGeneration({ variationOf: activeCreative });
              }
            }}
            onSaveDraft={handleSaveDraft}
            onCopy={handleCopy}
            onPublish={handleOpenPublish}
            canPublish={Boolean(activeCreative)}
          />
        </div>
      </div>

      {publishMessage && (
        <p className="text-sm text-adtraxio-accent">{publishMessage}</p>
      )}

      <PublishPanel
        open={publishOpen}
        contentId={draftId}
        caption={activeCreative ? buildPublishCaption(activeCreative) : ""}
        onClose={() => setPublishOpen(false)}
        onSuccess={(message) => setPublishMessage(message)}
      />

      <ContentApprovalPanel contentId={draftId} />

      <RecentDrafts
        drafts={recentDrafts}
        activeDraftId={draftId}
        loading={draftsLoading}
        onSelect={handleLoadDraft}
      />
    </div>
  );
}
