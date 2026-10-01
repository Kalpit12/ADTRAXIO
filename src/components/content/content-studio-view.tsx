"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioVisualPanel } from "@/components/content/studio-visual-panel";
import { CreativeBriefPanel } from "@/components/content/creative-brief-panel";
import {
  CreativeOutputPanel,
  type CreativeReviewStatus,
} from "@/components/content/creative-output-panel";
import { RecentDrafts } from "@/components/content/recent-drafts";
import { CampaignSelect } from "@/components/content/campaign-select";
import {
  ContentWorkflowStrip,
  type WorkflowStepId,
} from "@/components/content/content-workflow-strip";
import { ContentApprovalPanel } from "@/components/collaboration/content-approval-panel";
import { PublishPanel } from "@/components/publishing/publish-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getDraft, listRecentDrafts, saveDraft } from "@/lib/content/service";
import {
  defaultCreativeBrief,
  type ContentDraftSummary,
  type CreativeBrief,
  type GeneratedCreative,
} from "@/lib/content/types";
import Link from "next/link";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { validateCreativeBrief } from "@/lib/content/validation";
import { fetchSignedAssetUrl } from "@/lib/content/visual-client";
import {
  loadPersistedStudioVisual,
  persistStudioVisual,
} from "@/lib/content/visual-persistence";
import {
  emptyStudioVisualState,
  contentPreviewMediaType,
  getActiveStudioVisualAsset,
  type StudioVisualState,
} from "@/lib/content/visual-types";

const STUDIO_SESSION_KEY = "adly_content_studio_session";

function getOrCreateStudioSessionId(): string {
  if (typeof window === "undefined") return "server";
  const existing = sessionStorage.getItem(STUDIO_SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(STUDIO_SESSION_KEY, id);
  return id;
}

function creativesEqual(a: GeneratedCreative, b: GeneratedCreative): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ContentStudioView() {
  const [brief, setBrief] = useState<CreativeBrief>(defaultCreativeBrief());
  const [briefErrors, setBriefErrors] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<GeneratedCreative[]>([]);
  const [baselines, setBaselines] = useState<GeneratedCreative[]>([]);
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
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );
  const [savedSinceEdit, setSavedSinceEdit] = useState(false);
  const [studioSessionId] = useState(() => getOrCreateStudioSessionId());
  const [studioVisual, setStudioVisual] = useState<StudioVisualState>(
    emptyStudioVisualState()
  );
  const [visualAttached, setVisualAttached] = useState(false);
  const [previewVisualUrl, setPreviewVisualUrl] = useState<string | null>(null);
  const [imageConfigured, setImageConfigured] = useState(true);
  const [videoConfigured, setVideoConfigured] = useState(true);
  const [audioConfigured, setAudioConfigured] = useState(true);

  const activeCreative = versions[activeVersionIndex];
  const baseline = baselines[activeVersionIndex];
  const activeVisualAsset = getActiveStudioVisualAsset(studioVisual);
  const previewVisualType =
    contentPreviewMediaType(activeVisualAsset) ?? "image";

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

  useEffect(() => {
    fetch("/api/ai/media/image")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        setImageConfigured(data.configured !== false);
      })
      .catch(() => setImageConfigured(false));
  }, []);

  useEffect(() => {
    fetch("/api/ai/media/video")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        setVideoConfigured(data.configured !== false);
      })
      .catch(() => setVideoConfigured(false));
  }, []);

  useEffect(() => {
    fetch("/api/ai/media/speech")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        setAudioConfigured(data.configured !== false);
      })
      .catch(() => setAudioConfigured(false));
  }, []);

  useEffect(() => {
    const persisted = loadPersistedStudioVisual(draftId, studioSessionId);
    if (persisted.assets.length > 0) {
      setStudioVisual(persisted);
    }
  }, [draftId, studioSessionId]);

  useEffect(() => {
    persistStudioVisual(draftId, studioSessionId, studioVisual);
  }, [draftId, studioSessionId, studioVisual]);

  useEffect(() => {
    if (!visualAttached || !studioVisual.activeAssetId) {
      setPreviewVisualUrl(null);
      return;
    }
    void fetchSignedAssetUrl(studioVisual.activeAssetId).then((url) => {
      setPreviewVisualUrl(url);
    });
  }, [visualAttached, studioVisual.activeAssetId]);

  const reviewStatus: CreativeReviewStatus = useMemo(() => {
    if (!activeCreative) return "empty";
    if (saveMessage && savedSinceEdit) return "saved";
    if (baseline && !creativesEqual(activeCreative, baseline)) return "edited";
    return "generated";
  }, [activeCreative, baseline, saveMessage, savedSinceEdit]);

  const workflowStep: WorkflowStepId = useMemo(() => {
    if (draftId && saveMessage) return "save";
    if (activeCreative && reviewStatus === "edited") return "edit";
    if (activeCreative) return "review";
    if (generating) return "generate";
    return "brief";
  }, [activeCreative, draftId, generating, reviewStatus, saveMessage]);

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
    setSavedSinceEdit(false);

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
        setGenerationError("We could not read the generated creative. Try again.");
        return;
      }

      setAiNotConfigured(false);

      if (options?.variationOf) {
        setVersions((prev) => [...prev, payload.creative!]);
        setBaselines((prev) => [...prev, payload.creative!]);
        setActiveVersionIndex((prev) => prev + 1);
      } else {
        setVersions([payload.creative]);
        setBaselines([payload.creative]);
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
    setSavedSinceEdit(false);
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
      studioVisual,
      status: "draft",
    });

    setSaving(false);

    if (result.error) {
      setGenerationError(result.error);
      return;
    }

    if (result.data) {
      setDraftId(result.data.id);
      setSavedSinceEdit(true);

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
    setBaselines([result.data.creative]);
    setActiveVersionIndex(0);
    setDraftId(result.data.id);
    setStudioVisual(result.data.studioVisual ?? emptyStudioVisualState());
    setVisualAttached(Boolean(result.data.studioVisual?.activeAssetId));
    setBriefErrors({});
    setGenerationError(null);
    setSaveMessage("Draft loaded.");
    setSavedSinceEdit(true);
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
        studioVisual,
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
      <PageHeader
        title="Content Studio"
        description="Create platform-ready content with your brand, audience, and goal in context."
      >
        {activeCreative ? (
          <Button
            type="button"
            size="sm"
            disabled={saving || generating}
            onClick={() => void handleSaveDraft()}
          >
            {saving ? "Saving…" : "Save draft"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={generating || aiNotConfigured}
            onClick={() => void runGeneration()}
          >
            {generating ? "Generating…" : "Generate"}
          </Button>
        )}
        <Link href="/create/creative">
          <Button type="button" size="sm" variant="outline">
            Creative Studio
          </Button>
        </Link>
        <AskAdtraxioLink
          variant="button"
          label="Open in Copilot"
          prompt={
            activeCreative
              ? `Improve this content draft for ${brief.platform}:\nHook: ${activeCreative.hook}\nHeadline: ${activeCreative.headline}\nPrimary copy: ${activeCreative.primaryCopy}\nCTA: ${activeCreative.cta}`
              : "Help me create stronger content based on my top-performing posts and current brief."
          }
        />
      </PageHeader>

      <ContentWorkflowStrip activeStep={workflowStep} />

      <p className="text-xs text-muted-foreground">
        Connect a social account to publish later.{" "}
        <a
          href="/social"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Manage connections
        </a>
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(280px,36%)_minmax(0,64%)] lg:gap-12 lg:items-start">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <CreativeBriefPanel
            brief={brief}
            errors={briefErrors}
            generating={generating}
            aiNotConfigured={aiNotConfigured}
            onChange={handleBriefChange}
            onGenerate={() => void runGeneration()}
          />
        </div>

        <div className="min-w-0">
          <div className="mb-6 max-w-sm">
            <CampaignSelect
              value={selectedCampaignId}
              onChange={setSelectedCampaignId}
              disabled={saving || generating}
            />
          </div>

          <div className="mb-8">
            <StudioVisualPanel
              defaultPrompt={
                activeCreative?.creativeDirection?.trim() ||
                brief.topic.trim() ||
                brief.additionalContext.trim()
              }
              visualState={studioVisual}
              attachedToContent={visualAttached}
              disabled={saving || generating}
              imageConfigured={imageConfigured}
              videoConfigured={videoConfigured}
              audioConfigured={audioConfigured}
              onVisualStateChange={setStudioVisual}
              onAttachToContent={() => setVisualAttached(true)}
              onSaveVisual={() => void handleSaveDraft()}
            />
          </div>

          <CreativeOutputPanel
            versions={versions}
            activeVersionIndex={activeVersionIndex}
            platform={brief.platform}
            contentType={brief.contentType}
            generating={generating}
            saving={saving}
            saveMessage={saveMessage}
            copyMessage={copyMessage}
            generationError={generationError}
            aiNotConfigured={aiNotConfigured}
            reviewStatus={reviewStatus}
            onSelectVersion={setActiveVersionIndex}
            onCreativeChange={handleCreativeChange}
            onRegenerate={() => void runGeneration()}
            onCreateVariation={() => {
              if (activeCreative) {
                void runGeneration({ variationOf: activeCreative });
              }
            }}
            onSaveDraft={() => void handleSaveDraft()}
            onCopy={() => void handleCopy()}
            onPublish={() => void handleOpenPublish()}
            canPublish={Boolean(activeCreative)}
            onRetryGenerate={() => void runGeneration()}
            previewVisualUrl={previewVisualUrl}
            previewVisualType={previewVisualType}
          />
        </div>
      </div>

      {publishMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {publishMessage}
        </p>
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
        onSelect={(id) => void handleLoadDraft(id)}
      />
    </div>
  );
}
