"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  StrategicAction,
  StrategicPlanRecord,
} from "@/lib/strategist/types";
import { LearningOutcomesPanel } from "./learning-outcomes-panel";
import { StrategyEvaluationPanel } from "./strategy-evaluation-panel";

const KIND_LABEL: Record<string, string> = {
  measured: "Measured",
  observed: "Observed",
  interpreted: "Interpreted",
  recommended: "Recommended",
};

function ActionCard({
  action,
  onPatch,
}: {
  action: StrategicAction;
  onPatch: (
    actionId: string,
    patch: Partial<Pick<StrategicAction, "reviewStatus" | "title" | "instructions">>
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-adtraxio-surface/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <input
            className="w-full text-sm font-medium text-foreground bg-transparent outline-none"
            value={action.title}
            onChange={(e) => onPatch(action.id, { title: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {action.type.replace(/_/g, " ")} · {action.priority} priority ·{" "}
            {action.confidence} confidence
            {action.platform ? ` · ${action.platform}` : ""}
          </p>
          <p className="mt-2 text-sm text-foreground/85">{action.reason}</p>
          {action.evidence.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
              {action.evidence.slice(0, 4).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <label className="mt-3 block text-xs text-muted-foreground">
            Instructions
            <textarea
              className="mt-1 w-full rounded border border-border/60 bg-background/50 px-2 py-1 text-sm text-foreground"
              rows={2}
              value={action.instructions ?? ""}
              onChange={(e) =>
                onPatch(action.id, { instructions: e.target.value })
              }
            />
          </label>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            size="sm"
            variant={action.reviewStatus === "approved" ? "default" : "outline"}
            onClick={() => onPatch(action.id, { reviewStatus: "approved" })}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant={action.reviewStatus === "rejected" ? "destructive" : "outline"}
            onClick={() => onPatch(action.id, { reviewStatus: "rejected" })}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StrategicPlanView({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<StrategicPlanRecord | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepareResult, setPrepareResult] = useState<string | null>(null);
  const [historicalLearnings, setHistoricalLearnings] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/strategist/plan/${planId}`);
    const payload = (await res.json()) as {
      plan?: StrategicPlanRecord;
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

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/learning/outcomes?status=measured&limit=5");
      const payload = (await res.json()) as {
        outcomes?: Array<{ learning?: { summary?: string } }>;
      };
      const lines = (payload.outcomes ?? [])
        .map((o) => o.learning?.summary)
        .filter(Boolean);
      setHistoricalLearnings(lines.length ? lines.join("\n") : null);
    })();
  }, []);

  async function savePatches(
    actionId: string,
    patch: Partial<Pick<StrategicAction, "reviewStatus" | "title" | "instructions">>
  ) {
    if (!plan) return;
    const res = await fetch(`/api/strategist/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionPatches: [{ actionId, ...patch }],
      }),
    });
    const payload = (await res.json()) as { plan?: StrategicPlanRecord };
    if (payload.plan) setPlan(payload.plan);
  }

  async function prepareApproved() {
    setBusy(true);
    setError(null);
    setPrepareResult(null);
    try {
      const res = await fetch(`/api/strategist/plan/${planId}/prepare`, {
        method: "POST",
      });
      const payload = (await res.json()) as {
        reviewUrl?: string;
        executionPlanId?: string;
        preparationErrors?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Prepare failed.");
        return;
      }
      setPrepareResult(
        payload.reviewUrl
          ? `Execution plan ready. Continue review at ${payload.reviewUrl}`
          : "Execution plan prepared."
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function cancelPlan() {
    setBusy(true);
    const res = await fetch(`/api/strategist/plan/${planId}/cancel`, {
      method: "POST",
    });
    if (res.ok) await load();
    setBusy(false);
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading strategic plan…</p>;
  }

  if (!plan) {
    return <p className="p-6 text-sm text-red-400/90">{error ?? "Plan not found."}</p>;
  }

  const approvedCount = plan.plan.actions.filter(
    (a) => a.reviewStatus === "approved"
  ).length;
  const executionUrl = plan.plan.executionPlanId
    ? `/assistant/execution/${plan.plan.executionPlanId}`
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="border-b border-border/60 px-6 py-4">
        <Link
          href="/assistant"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Assistant
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Strategic plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">{plan.objective}</p>
        <p className="mt-2 text-xs capitalize text-muted-foreground">
          {plan.strategyType.replace(/_/g, " ")} · {plan.confidence} confidence ·{" "}
          {plan.status}
          {expired ? " · expired" : ""}
        </p>
      </div>

      <div className="space-y-6 p-6">
        <section>
          <h2 className="text-sm font-medium text-foreground">Summary</h2>
          <p className="mt-2 text-sm text-foreground/90">{plan.plan.summary}</p>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground">Evidence</h2>
          <ul className="mt-2 space-y-2">
            {plan.evidence.map((e, i) => (
              <li
                key={`${e.metric}-${i}`}
                className="rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <span className="text-xs font-medium text-adtraxio-accent">
                  {KIND_LABEL[e.interpretation] ?? e.interpretation}
                </span>
                <p className="font-medium">{e.metric}</p>
                <p className="text-muted-foreground">{e.value}</p>
                <p className="text-xs text-muted-foreground">
                  {e.period} · {e.source}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {plan.plan.insights.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-foreground">Insights</h2>
            <ul className="mt-2 space-y-2">
              {plan.plan.insights.map((ins) => (
                <li key={ins.title} className="text-sm">
                  <span className="text-xs text-adtraxio-accent">
                    {KIND_LABEL[ins.kind]}
                  </span>
                  <p className="font-medium">{ins.title}</p>
                  <p className="text-muted-foreground">{ins.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan.plan.adaptive && (
          <section className="rounded-xl border border-adtraxio-accent/30 bg-adtraxio-surface/20 p-4">
            <h2 className="text-sm font-medium text-foreground">Adaptive insights</h2>
            <p className="mt-2 text-sm text-foreground/90">
              {plan.plan.adaptive.currentSituation}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {plan.plan.adaptive.evidenceSummary}
            </p>
            {plan.plan.adaptive.mixedEvidenceNote && (
              <p className="mt-2 text-xs text-amber-200/80">
                {plan.plan.adaptive.mixedEvidenceNote}
              </p>
            )}
            {plan.plan.adaptive.adaptations.length > 0 && (
              <ul className="mt-4 space-y-3">
                {plan.plan.adaptive.adaptations.map((a, idx) => (
                  <li key={`${a.learningId ?? idx}`} className="text-sm">
                    <p className="text-xs font-medium uppercase text-adtraxio-accent">
                      Adaptation · {a.confidence} confidence
                    </p>
                    <p className="font-medium">Previous learning</p>
                    <p className="text-foreground/85">{a.learning}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.relevance}
                    </p>
                    <p className="mt-1 text-foreground/90">
                      <span className="text-xs text-muted-foreground">Application: </span>
                      {a.application}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {historicalLearnings && !plan.plan.adaptive?.adaptations.length && (
          <section>
            <h2 className="text-sm font-medium text-foreground">
              Previous learnings relevant to this strategy
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {historicalLearnings}
            </p>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium text-foreground">Recommended actions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Approve actions to include them in the execution plan. Nothing runs until
            you prepare and complete the existing execution review flow.
          </p>
          <div className="mt-3 space-y-3">
            {plan.plan.actions.map((action) => (
              <ActionCard key={action.id} action={action} onPatch={savePatches} />
            ))}
          </div>
        </section>

        {plan.plan.alternatives && plan.plan.alternatives.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-foreground">Alternative approaches</h2>
            {plan.plan.alternatives.map((alt) => (
              <div key={alt.label} className="mt-2 rounded-lg border border-border/40 p-3">
                <p className="font-medium">{alt.label}</p>
                <p className="text-sm text-muted-foreground">{alt.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alt.actions.length} action(s) — adopt manually by approving similar
                  steps above if desired.
                </p>
              </div>
            ))}
          </section>
        )}

        {error && <p className="text-sm text-red-400/90">{error}</p>}
        {prepareResult && (
          <p className="text-sm text-foreground/90">
            {prepareResult}
            {executionUrl && (
              <>
                {" "}
                <Link href={executionUrl} className="text-adtraxio-accent hover:underline">
                  Open execution plan
                </Link>
              </>
            )}
          </p>
        )}

        <StrategyEvaluationPanel strategicPlanId={planId} title="Strategy evaluation" />
        <LearningOutcomesPanel strategicPlanId={planId} title="Outcomes from related executions" />

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy || expired || approvedCount === 0 || plan.status === "cancelled"}
            onClick={() => void prepareApproved()}
          >
            Prepare approved actions ({approvedCount})
          </Button>
          {executionUrl && (
            <Button variant="outline" asChild>
              <Link href={executionUrl}>Go to execution review</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy || plan.status === "cancelled"}
            onClick={() => void cancelPlan()}
          >
            Cancel plan
          </Button>
        </div>
      </div>
    </div>
  );
}
