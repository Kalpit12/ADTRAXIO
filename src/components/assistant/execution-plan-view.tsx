"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExecutionPlanRecord, ExecutionPlanStep } from "@/lib/execution/types";
import { ExecutionStepTimeline } from "@/components/copilot/execution-step-timeline";
import { LearningOutcomesPanel } from "./learning-outcomes-panel";
import { StrategyEvaluationPanel } from "./strategy-evaluation-panel";

function stepDetail(step: ExecutionPlanStep): string {
  const draftCount = step.result?.contentIds?.length ?? 0;
  const scheduleCount = step.result?.scheduleItems?.length ?? 0;
  if (step.type === "create_content" || step.type === "repurpose_content") {
    return `${draftCount} draft${draftCount === 1 ? "" : "s"} created`;
  }
  if (step.type === "create_campaign") {
    return step.result?.campaignId
      ? "Draft campaign prepared"
      : "Campaign pending";
  }
  if (step.type === "prepare_schedule") {
    return `${scheduleCount} post${scheduleCount === 1 ? "" : "s"} prepared`;
  }
  if (step.type === "analyze") return step.result?.message ?? "Complete";
  return "";
}

function StepCard({
  step,
  onToggleApprove,
  onScheduleChange,
  embedded = false,
}: {
  step: ExecutionPlanStep;
  onToggleApprove: (stepId: string, approved: boolean) => void;
  onScheduleChange?: (
    stepId: string,
    items: NonNullable<ExecutionPlanStep["result"]>["scheduleItems"]
  ) => void;
  embedded?: boolean;
}) {
  const draftCount = step.result?.contentIds?.length ?? 0;
  const scheduleCount = step.result?.scheduleItems?.length ?? 0;
  const detail = stepDetail(step);

  return (
    <div
      className={
        embedded
          ? "pt-1"
          : "rounded-md border border-border/60 bg-adtraxio-surface/15 p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {!embedded && (
            <>
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground capitalize">
                {step.type.replace(/_/g, " ")} · {step.status}
              </p>
            </>
          )}
          {detail && embedded && (
            <p className="text-sm text-foreground/85">{detail}</p>
          )}
          {detail && !embedded && (
            <p className="mt-2 text-sm text-foreground/85">{detail}</p>
          )}
          {step.error && (
            <p className="mt-2 text-xs text-red-400/90">{step.error}</p>
          )}
        </div>
        {step.requiresConfirmation &&
          (step.status === "ready" ||
            step.status === "failed" ||
            step.status === "needs_review" ||
            step.status === "approved") && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={step.approved}
              onChange={(e) => onToggleApprove(step.id, e.target.checked)}
            />
            Approve
          </label>
        )}
      </div>
      {step.type === "prepare_schedule" &&
        scheduleCount > 0 &&
        onScheduleChange && (
          <ul className="mt-3 space-y-2">
            {step.result?.scheduleItems?.map((item, idx) => (
              <li key={`${item.contentId}-${idx}`} className="text-xs">
                <span className="text-muted-foreground">{item.platform} · </span>
                <input
                  type="datetime-local"
                  className="rounded border border-border/60 bg-background/50 px-2 py-1"
                  value={item.scheduledFor.slice(0, 16)}
                  onChange={(e) => {
                    const items = [...(step.result?.scheduleItems ?? [])];
                    const next = new Date(e.target.value).toISOString();
                    items[idx] = { ...items[idx], scheduledFor: next };
                    onScheduleChange(step.id, items);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      {(step.type === "create_content" || step.type === "repurpose_content") &&
        draftCount > 0 && (
        <Link
          href="/content"
          className="mt-3 inline-block text-xs font-medium text-adtraxio-accent hover:underline"
        >
          Review drafts in Content Studio
        </Link>
      )}
      {step.type === "create_campaign" && step.result?.campaignId && (
        <Link
          href={`/campaigns/${step.result.campaignId}`}
          className="mt-3 inline-block text-xs font-medium text-adtraxio-accent hover:underline"
        >
          Review campaign
        </Link>
      )}
    </div>
  );
}

export function ExecutionPlanView({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<ExecutionPlanRecord | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/execution/plan/${planId}`);
    const payload = (await res.json()) as {
      plan?: ExecutionPlanRecord;
      expired?: boolean;
      error?: string;
    };
    if (!res.ok) {
      setError(payload.error ?? "Unable to load plan.");
      setLoading(false);
      return;
    }
    setPlan(payload.plan ?? null);
    setExpired(Boolean(payload.expired));
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchSchedule(
    stepId: string,
    scheduleItems: NonNullable<ExecutionPlanStep["result"]>["scheduleItems"]
  ) {
    const res = await fetch(`/api/execution/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepPatches: [{ stepId, scheduleItems }],
      }),
    });
    const payload = (await res.json()) as { plan?: ExecutionPlanRecord };
    if (payload.plan) setPlan(payload.plan);
  }

  async function patchStep(stepId: string, approved: boolean) {
    if (!plan) return;
    const res = await fetch(`/api/execution/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepPatches: [{ stepId, approved }],
      }),
    });
    const payload = (await res.json()) as { plan?: ExecutionPlanRecord };
    if (payload.plan) setPlan(payload.plan);
  }

  async function retryFailed() {
    setExecuting(true);
    setError(null);
    try {
      const res = await fetch(`/api/execution/plan/${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", retryFailedOnly: true }),
      });
      const payload = (await res.json()) as {
        plan?: ExecutionPlanRecord;
        results?: Array<{ success: boolean; error?: string }>;
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Retry failed.");
        return;
      }
      setPlan(payload.plan ?? plan);
      await load();
    } finally {
      setExecuting(false);
    }
  }

  async function executeApproved() {
    setExecuting(true);
    setError(null);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/execution/plan/${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute" }),
      });
      const payload = (await res.json()) as {
        plan?: ExecutionPlanRecord;
        results?: Array<{ success: boolean; error?: string }>;
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Execution failed.");
        return;
      }
      setPlan(payload.plan ?? plan);
      const ok = payload.results?.filter((r) => r.success).length ?? 0;
      const fail = payload.results?.filter((r) => !r.success).length ?? 0;
      if (fail > 0) {
        setResultMessage(`Partially completed: ${ok} succeeded, ${fail} failed.`);
      } else {
        setResultMessage(`Execution complete: ${ok} step(s) processed.`);
      }
    } catch {
      setError("Execution failed.");
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading execution plan…</p>;
  }
  if (error && !plan) {
    return <p className="p-6 text-sm text-red-300">{error}</p>;
  }
  if (!plan) return null;

  const contentStep = plan.plan.steps.find(
    (s) => s.type === "create_content" || s.type === "repurpose_content"
  );
  const failedSteps = plan.plan.steps.filter(
    (s) => s.status === "failed" || s.status === "needs_review"
  );
  const campaignStep = plan.plan.steps.find((s) => s.type === "create_campaign");
  const scheduleStep = plan.plan.steps.find((s) => s.type === "prepare_schedule");

  const externalCount =
    (scheduleStep?.approved && scheduleStep.result?.scheduleItems?.length) || 0;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] space-y-8 px-4 py-6">
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Growth Copilot
        </Link>

        <header>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Execution plan
          </p>
          <h1 className="mt-1 font-heading text-2xl tracking-tight">{plan.title}</h1>
          <p className="mt-2 text-xs text-muted-foreground capitalize">
            Status: {plan.status.replace(/_/g, " ")}
          </p>
        </header>

        {expired && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            This execution plan has expired. Review and prepare a new plan.
          </p>
        )}

        <section className="space-y-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Objective
          </h2>
          <p className="text-sm text-foreground/90">{plan.objective}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Why ADTRAXIO recommends this
          </h2>
          <p className="text-sm text-muted-foreground">{plan.plan.rationale}</p>
          {plan.plan.evidence.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {plan.plan.evidence.slice(0, 5).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Steps
          </h2>
          <ExecutionStepTimeline
            steps={plan.plan.steps.map((step, index) => ({
              id: step.id,
              index: index + 1,
              title: step.title,
              status: step.status,
              detail: stepDetail(step) || undefined,
              children: (
                <StepCard
                  step={step}
                  embedded
                  onToggleApprove={patchStep}
                  onScheduleChange={patchSchedule}
                />
              ),
            }))}
          />
        </section>

        {(plan.plan.auditLog?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Activity
            </h2>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {[...(plan.plan.auditLog ?? [])].reverse().slice(0, 12).map((entry, i) => (
                <li key={`${entry.at}-${i}`}>
                  {new Date(entry.at).toLocaleString()} · {entry.action}
                  {entry.stepId ? ` (${entry.stepId.slice(0, 8)}…)` : ""}
                  {entry.error ? ` — ${entry.error}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border/60 bg-adtraxio-surface/30 p-5 space-y-4">
          <h2 className="text-sm font-medium">Ready to execute</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            {contentStep?.result?.contentIds?.length ? (
              <li>
                {contentStep.result.contentIds.length} content draft
                {contentStep.result.contentIds.length === 1 ? "" : "s"}
              </li>
            ) : null}
            {campaignStep?.result?.campaignId ? (
              <li>1 campaign draft</li>
            ) : null}
            {scheduleStep?.result?.scheduleItems?.length ? (
              <li>
                {scheduleStep.result.scheduleItems.length} schedule item
                {scheduleStep.result.scheduleItems.length === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>
          {externalCount > 0 && (
            <p className="text-xs text-amber-200/90">
              External actions: up to {externalCount} scheduled post
              {externalCount === 1 ? "" : "s"} (only if schedule step is approved).
            </p>
          )}
          {resultMessage && (
            <p className="text-sm text-adtraxio-accent">{resultMessage}</p>
          )}
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => void load()}
            >
              Refresh
            </Button>
            <Button
              type="button"
              disabled={executing || expired}
              onClick={() => void executeApproved()}
            >
              {executing ? "Executing…" : "Execute approved items"}
            </Button>
            {failedSteps.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                disabled={executing || expired}
                onClick={() => void retryFailed()}
              >
                Retry failed steps
              </Button>
            )}
          </div>
        </section>

        <LearningOutcomesPanel executionPlanId={planId} title="Outcome learning" />
        <StrategyEvaluationPanel executionPlanId={planId} title="Evaluation" />
      </div>
    </div>
  );
}
