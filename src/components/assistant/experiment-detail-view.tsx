"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExperimentRecord, VariantComparisonResult } from "@/lib/experiments/types";
import { ExperimentCrossEvidenceSection } from "./experiment-cross-evidence-section";
import { ExperimentEvaluationSection } from "./experiment-evaluation-section";
import { ExperimentIntelligenceSections } from "./experiment-intelligence-sections";

const CLASS_LABEL: Record<string, string> = {
  positive_signal: "Positive signal",
  negative_signal: "Negative signal",
  mixed_signal: "Mixed signal",
  insufficient_data: "Insufficient data",
  inconclusive: "Inconclusive",
};

export function ExperimentDetailView({ experimentId }: { experimentId: string }) {
  const [experiment, setExperiment] = useState<ExperimentRecord | null>(null);
  const [comparison, setComparison] = useState<VariantComparisonResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/experiments/${experimentId}`);
    const payload = (await res.json()) as { experiment?: ExperimentRecord };
    setExperiment(payload.experiment ?? null);
    if (payload.experiment?.status === "running" || payload.experiment?.status === "completed") {
      const cmp = await fetch(`/api/experiments/${experimentId}/compare`);
      const cmpJson = (await cmp.json()) as { comparison?: VariantComparisonResult };
      setComparison(cmpJson.comparison ?? payload.experiment?.allocation.lastComparison ?? null);
    }
  }, [experimentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(path: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Request failed");
      await load();
      setMessage("Updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!experiment) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  const interp = experiment.interpretation as { summary?: string };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border/60 px-6 py-4">
        <Link
          href="/assistant/experiments"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Experiments
        </Link>
        <h1 className="text-lg font-semibold">{experiment.name}</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {experiment.status} · Primary metric: {experiment.successMetric} ·{" "}
          {experiment.minimumObservationDays} day observation
        </p>
      </div>
      <div className="space-y-6 p-6">
        <section>
          <h2 className="text-sm font-semibold">Objective</h2>
          <p className="mt-1 text-sm">{experiment.objective}</p>
          <h2 className="mt-4 text-sm font-semibold">Hypothesis</h2>
          <p className="mt-1 text-sm text-foreground/90">{experiment.hypothesis}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">Variants & allocation</h2>
          <ul className="mt-2 space-y-2">
            {(experiment.variants ?? []).map((v) => (
              <li key={v.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <p className="font-medium">{v.variantKey}: {v.name}</p>
                <p className="text-muted-foreground">{v.allocationPercent}% · {v.status}</p>
                {experiment.status === "running" || experiment.status === "completed" ? (
                  <p className="mt-1 text-xs">
                    Observed {experiment.successMetric}:{" "}
                    {v.outcome.engagement ?? v.outcome.impressions ?? "—"}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {comparison && (
          <section className="rounded-lg border border-border/60 bg-card/40 p-4">
            <h2 className="text-sm font-semibold">Evaluation</h2>
            <p className="mt-1 text-sm font-medium">
              {CLASS_LABEL[comparison.classification] ?? comparison.classification}
            </p>
            {comparison.higherObservedVariantKey && (
              <p className="mt-1 text-sm text-muted-foreground">
                Higher observed result: variant {comparison.higherObservedVariantKey} (not causal
                proof).
              </p>
            )}
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
              {comparison.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        {interp.summary && (
          <section>
            <h2 className="text-sm font-semibold">Interpretation</h2>
            <p className="mt-1 text-sm">{interp.summary}</p>
          </section>
        )}

        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <ExperimentEvaluationSection experimentId={experimentId} />
        <ExperimentCrossEvidenceSection experimentId={experimentId} />
        <ExperimentIntelligenceSections experimentId={experimentId} />

        <div className="flex flex-wrap gap-2">
          {experiment.status === "draft" && (
            <Button disabled={busy} onClick={() => void post(`/api/experiments/${experimentId}/review`)}>
              Submit for review
            </Button>
          )}
          {(experiment.status === "review" || experiment.status === "draft") && (
            <Button disabled={busy} onClick={() => void post(`/api/experiments/${experimentId}/approve`)}>
              Approve
            </Button>
          )}
          {experiment.status === "approved" && (
            <>
              <Button disabled={busy} onClick={() => void post(`/api/experiments/${experimentId}/prepare`)}>
                Prepare variants
              </Button>
              <Button disabled={busy} variant="secondary" onClick={() => void post(`/api/experiments/${experimentId}/start`)}>
                Start experiment
              </Button>
            </>
          )}
          {experiment.status === "running" && (
            <Button disabled={busy} onClick={() => void post(`/api/experiments/${experimentId}/measure`)}>
              Measure experiment
            </Button>
          )}
          {experiment.allocation.executionPlanId && (
            <Button variant="outline" asChild>
              <Link href={`/assistant/execution/${experiment.allocation.executionPlanId}`}>
                Open execution plan
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
