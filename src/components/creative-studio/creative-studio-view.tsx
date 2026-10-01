"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreativeBriefPanel } from "@/components/content/creative-brief-panel";
import { AssetSlotCard } from "@/components/creative-studio/asset-slot-card";
import { CreativeCanvas } from "@/components/creative-studio/creative-canvas";
import { CreativeCampaignPanel } from "@/components/creative-studio/creative-campaign-panel";
import { CreativeWorkflowStrip } from "@/components/creative-studio/creative-workflow-strip";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StudioTextarea } from "@/components/content/studio-field";
import {
  attachCreativeStudioToVisual,
  buildAssetPlanFromConcept,
  conceptToGeneratedCreative,
  derivePackageStatus,
  syncVisualAssetsFromSlots,
  updateAssetSlot,
  removeAssetSlot,
} from "@/lib/content/creative-studio";
import { generateAssetForSlot } from "@/lib/content/creative-studio-assets";
import type {
  CreativeConcept,
  CreativeStudioSnapshot,
  CreativeWorkflowStep,
} from "@/lib/content/creative-studio-types";
import { emptyCreativeStudioSnapshot } from "@/lib/content/creative-studio-types";
import { saveDraft } from "@/lib/content/service";
import {
  defaultCreativeBrief,
  type CreativeBrief,
} from "@/lib/content/types";
import { validateCreativeBrief } from "@/lib/content/validation";
import { emptyStudioVisualState } from "@/lib/content/visual-types";

export function CreativeStudioView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brief, setBrief] = useState<CreativeBrief>(defaultCreativeBrief());
  const [briefErrors, setBriefErrors] = useState<Record<string, string>>({});
  const [studio, setStudio] = useState<CreativeStudioSnapshot>(
    emptyCreativeStudioSnapshot()
  );
  const [draftId, setDraftId] = useState<string | null>(null);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiNotConfigured, setAiNotConfigured] = useState(false);
  const [visualAssets, setVisualAssets] = useState(
    emptyStudioVisualState().assets
  );
  const slotAbortRef = useRef<AbortController | null>(null);
  const generatingSlotRef = useRef<string | null>(null);

  const workflowStep = studio.workflowStep;
  const packageStatus = derivePackageStatus(studio);
  const concept = studio.concept;

  const goToStep = useCallback((step: CreativeWorkflowStep) => {
    setStudio((prev) => ({ ...prev, workflowStep: step }));
  }, []);

  useEffect(() => {
    const editedAssetId = searchParams.get("editedAssetId");
    const slotId = searchParams.get("slotId");
    if (!editedAssetId || !slotId) return;
    setStudio((prev) => ({
      ...prev,
      assetSlots: updateAssetSlot(prev.assetSlots, slotId, {
        assetId: editedAssetId,
        status: "ready",
      }),
    }));
    router.replace("/create/creative");
  }, [searchParams, router]);

  async function handleGenerateConcept() {
    const errors = validateCreativeBrief(brief);
    setBriefErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setConceptLoading(true);
    setConceptError(null);
    setStudio((prev) => ({ ...prev, packageStatus: "generating" }));

    try {
      const response = await fetch("/api/ai/creative-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const payload = (await response.json()) as {
        concept?: CreativeConcept;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (payload.code === "AI_NOT_CONFIGURED") setAiNotConfigured(true);
        setConceptError(payload.error ?? "Unable to generate concept.");
        setStudio((prev) => ({ ...prev, packageStatus: "draft" }));
        return;
      }

      if (!payload.concept) {
        setConceptError("Concept response was invalid.");
        setStudio((prev) => ({ ...prev, packageStatus: "draft" }));
        return;
      }

      const slots = buildAssetPlanFromConcept(payload.concept);
      setStudio({
        workflowStep: "concept",
        packageStatus: "draft",
        concept: payload.concept,
        assetSlots: slots,
        canvas: {
          headline: payload.concept.headline,
          caption: payload.concept.caption,
          cta: payload.concept.cta,
        },
      });
      goToStep("concept");
    } catch {
      setConceptError("Unable to reach the concept service.");
      setStudio((prev) => ({ ...prev, packageStatus: "draft" }));
    } finally {
      setConceptLoading(false);
    }
  }

  async function handleGenerateSlot(slotId: string, regenerate = false) {
    if (!concept || generatingSlotRef.current) return;

    generatingSlotRef.current = slotId;
    slotAbortRef.current?.abort();
    const abort = new AbortController();
    slotAbortRef.current = abort;

    setStudio((prev) => ({
      ...prev,
      packageStatus: "generating",
      assetSlots: updateAssetSlot(prev.assetSlots, slotId, {
        status: "generating",
        errorMessage: undefined,
        ...(regenerate ? { assetId: undefined } : {}),
      }),
    }));

    const slot = studio.assetSlots.find((s) => s.id === slotId);
    if (!slot || !concept) {
      generatingSlotRef.current = null;
      return;
    }

    const result = await generateAssetForSlot(concept, slot, {
      signal: abort.signal,
      onProcessing: () => {
        setStudio((prev) => ({
          ...prev,
          assetSlots: updateAssetSlot(prev.assetSlots, slotId, {
            status: "processing",
          }),
        }));
      },
    });

    generatingSlotRef.current = null;

    if ("error" in result) {
      setStudio((prev) => ({
        ...prev,
        packageStatus: derivePackageStatus(prev),
        assetSlots: updateAssetSlot(prev.assetSlots, slotId, {
          status: "failed",
          errorMessage: result.error,
        }),
      }));
      return;
    }

    setStudio((prev) => {
      const nextSlots = updateAssetSlot(prev.assetSlots, slotId, {
        status: "ready",
        assetId: result.assetId,
        errorMessage: undefined,
      });
      const assets = syncVisualAssetsFromSlots(nextSlots, visualAssets);
      setVisualAssets(assets);
      return {
        ...prev,
        packageStatus: derivePackageStatus({ ...prev, assetSlots: nextSlots }),
        assetSlots: nextSlots,
      };
    });
  }

  async function handleSave() {
    if (!concept) return;
    const creative = conceptToGeneratedCreative(concept);
    const savedStudio = {
      ...studio,
      packageStatus: "saved" as const,
      workflowStep: "review" as const,
    };
    const studioVisual = attachCreativeStudioToVisual(
      {
        ...emptyStudioVisualState(),
        assets: syncVisualAssetsFromSlots(studio.assetSlots, visualAssets),
        activeAssetId:
          studio.assetSlots.find((s) => s.status === "ready")?.assetId ?? null,
      },
      savedStudio
    );

    const result = await saveDraft({
      id: draftId ?? undefined,
      brief,
      creative,
      studioVisual,
      status: "draft",
    });

    if (result.error) {
      setConceptError(result.error);
      return;
    }
    if (result.data) {
      setDraftId(result.data.id);
      setSaveMessage("Creative saved to Content Studio.");
      setStudio((prev) => ({
        ...prev,
        packageStatus: "saved",
        workflowStep: "review",
      }));
    }
  }

  const generatedCreative = concept ? conceptToGeneratedCreative(concept) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Creative Studio"
        description="Plan copy and media in one workflow — generate assets only when you choose."
      >
        <Link href="/create">
          <Button type="button" size="sm" variant="outline">
            Content Studio
          </Button>
        </Link>
        {concept && (
          <Button type="button" size="sm" onClick={() => void handleSave()}>
            Save creative
          </Button>
        )}
      </PageHeader>

      <CreativeWorkflowStrip activeStep={workflowStep} />

      <p className="text-xs text-muted-foreground" role="status">
        Package status: {packageStatus.replace("_", " ")}
        {saveMessage ? ` — ${saveMessage}` : ""}
      </p>

      {workflowStep === "brief" && (
        <div className="grid gap-10 lg:grid-cols-[minmax(280px,40%)_1fr]">
          <CreativeBriefPanel
            brief={brief}
            errors={briefErrors}
            generating={conceptLoading}
            aiNotConfigured={aiNotConfigured}
            onChange={(updates) => {
              setBrief((prev) => ({ ...prev, ...updates }));
              setBriefErrors({});
            }}
            onGenerate={() => void handleGenerateConcept()}
          />
          <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
            Complete the brief, then generate a structured concept. Media is not
            generated automatically.
          </div>
        </div>
      )}

      {conceptError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm" role="alert">
          {conceptError}
        </div>
      )}

      {concept && workflowStep !== "brief" && (
        <div className="flex flex-wrap gap-2">
          {(["concept", "assets", "compose", "review"] as const).map((step) => (
            <Button
              key={step}
              type="button"
              size="sm"
              variant={workflowStep === step ? "default" : "outline"}
              onClick={() => goToStep(step)}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </Button>
          ))}
        </div>
      )}

      {concept && workflowStep === "concept" && (
        <div className="space-y-4 rounded-md border border-border/70 p-4 sm:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Concept — editable
          </p>
          <StudioTextarea
            label="Creative angle"
            value={concept.creativeAngle}
            onChange={(e) =>
              setStudio((prev) =>
                prev.concept
                  ? {
                      ...prev,
                      concept: { ...prev.concept, creativeAngle: e.target.value },
                    }
                  : prev
              )
            }
            rows={2}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <StudioTextarea
              label="Hook"
              value={concept.hook}
              onChange={(e) =>
                setStudio((prev) =>
                  prev.concept
                    ? { ...prev, concept: { ...prev.concept, hook: e.target.value } }
                    : prev
                )
              }
              rows={2}
            />
            <StudioTextarea
              label="Headline"
              value={concept.headline}
              onChange={(e) =>
                setStudio((prev) =>
                  prev.concept
                    ? {
                        ...prev,
                        concept: { ...prev.concept, headline: e.target.value },
                      }
                    : prev
                )
              }
              rows={2}
            />
          </div>
          <StudioTextarea
            label="Primary copy"
            value={concept.primaryCopy}
            onChange={(e) =>
              setStudio((prev) =>
                prev.concept
                  ? {
                      ...prev,
                      concept: { ...prev.concept, primaryCopy: e.target.value },
                    }
                  : prev
              )
            }
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Suggested media: {concept.suggestedMedia.join(", ")}
          </p>
          <Button type="button" size="sm" onClick={() => goToStep("assets")}>
            Continue to assets
          </Button>
        </div>
      )}

      {concept && workflowStep === "assets" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate each asset explicitly. Failures on one asset do not block
            the others.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {studio.assetSlots.map((slot) => (
              <AssetSlotCard
                key={slot.id}
                slot={slot}
                disabled={Boolean(generatingSlotRef.current)}
                onGenerate={() => void handleGenerateSlot(slot.id)}
                onRegenerate={() => void handleGenerateSlot(slot.id, true)}
                onRemove={() =>
                  setStudio((prev) => ({
                    ...prev,
                    assetSlots: removeAssetSlot(prev.assetSlots, slot.id),
                  }))
                }
              />
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => goToStep("compose")}>
            Continue to compose
          </Button>
        </div>
      )}

      {concept && generatedCreative && workflowStep === "compose" && (
        <CreativeCanvas
          platform={brief.platform}
          contentType={brief.contentType}
          creative={generatedCreative}
          canvasHeadline={studio.canvas.headline}
          canvasCaption={studio.canvas.caption}
          canvasCta={studio.canvas.cta}
          slots={studio.assetSlots}
          visualAssets={visualAssets}
          onCanvasChange={(patch) =>
            setStudio((prev) => ({
              ...prev,
              canvas: { ...prev.canvas, ...patch },
            }))
          }
        />
      )}

      {concept && workflowStep === "review" && generatedCreative && (
        <div className="space-y-4">
          <div className="space-y-4 rounded-md border border-border/70 p-4">
            <p className="text-sm text-foreground">
              Review your creative package before saving or returning to Content
              Studio.
            </p>
            <ul className="text-sm text-muted-foreground">
              {studio.assetSlots.map((s) => (
                <li key={s.id}>
                  {s.label}: {s.status.replace("_", " ")}
                </li>
              ))}
            </ul>
            <Button type="button" size="sm" onClick={() => void handleSave()}>
              Save to Content Studio
            </Button>
          </div>
          <CreativeCampaignPanel
            brief={brief}
            studio={studio}
            visualAssets={visualAssets}
            caption={
              studio.canvas.caption ||
              generatedCreative.caption ||
              generatedCreative.primaryCopy
            }
          />
        </div>
      )}
    </div>
  );
}
