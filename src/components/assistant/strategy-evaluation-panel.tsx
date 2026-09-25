"use client";

import { useCallback, useEffect, useState } from "react";
import type { StrategyEvaluationRecord } from "@/lib/evaluation/types";
import { formatEvaluationSummary } from "@/lib/evaluation/context";

export function StrategyEvaluationPanel({
  strategicPlanId,
  executionPlanId,
  title = "Strategy evaluation",
}: {
  strategicPlanId?: string;
  executionPlanId?: string;
  title?: string;
}) {
  const [record, setRecord] = useState<StrategyEvaluationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (strategicPlanId) {
        const res = await fetch(
          `/api/evaluation/strategy?strategicPlanId=${encodeURIComponent(strategicPlanId)}`
        );
        const payload = (await res.json()) as { evaluation?: StrategyEvaluationRecord | null };
        setRecord(payload.evaluation ?? null);
        return;
      }
      if (executionPlanId) {
        const res = await fetch(
          `/api/evaluation/strategy?executionPlanId=${encodeURIComponent(executionPlanId)}`
        );
        const payload = (await res.json()) as { evaluation?: StrategyEvaluationRecord | null };
        setRecord(payload.evaluation ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [strategicPlanId, executionPlanId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-lg border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        Loading evaluation…
      </section>
    );
  }

  if (!record) {
    return (
      <section className="rounded-lg border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        <h3 className="mb-1 font-medium text-foreground">{title}</h3>
        <p>No strategy evaluation yet. Evaluations run after the outcome window completes.</p>
      </section>
    );
  }

  const summary = formatEvaluationSummary(record);
  const showBody =
    record.status === "evaluated" ||
    record.status === "inconclusive" ||
    record.status === "insufficient_data";

  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {!showBody ? (
        <p className="text-sm text-muted-foreground">
          Status: {record.status}. Measurement window ends{" "}
          {new Date(record.measureAfter).toLocaleDateString()}.
        </p>
      ) : (
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Result</dt>
            <dd className="font-medium">{summary.resultClassification}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Objective</dt>
            <dd className="capitalize">{summary.objective}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Measured</dt>
            <dd>{summary.measuredChange}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Attribution</dt>
            <dd className="capitalize">{summary.attributionLevel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</dt>
            <dd className="capitalize">{summary.confidence}</dd>
          </div>
          {summary.summary && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Summary</dt>
              <dd className="text-foreground/90">{summary.summary}</dd>
            </div>
          )}
          {summary.limitations.length > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Limitation</dt>
              <dd className="text-muted-foreground">{summary.limitations[0]}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Correlation is not causation. This evaluation does not prove the strategy caused the
        outcome.
      </p>
    </section>
  );
}
