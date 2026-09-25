"use client";

import { useEffect, useState } from "react";
import type { ExperimentEvaluationDocument } from "@/lib/evaluation/experiment";

export function ExperimentEvaluationSection({ experimentId }: { experimentId: string }) {
  const [doc, setDoc] = useState<ExperimentEvaluationDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/experiments/${experimentId}/evaluation`);
      const payload = (await res.json()) as { evaluation?: ExperimentEvaluationDocument | null };
      setDoc(payload.evaluation ?? null);
      setLoading(false);
    })();
  }, [experimentId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading evaluation…</p>;
  }
  if (!doc?.normalized) return null;

  const n = doc.normalized;
  const interp = doc.interpretation;

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/30 p-4">
      <h2 className="text-sm font-semibold">Measurement → Evaluation → Learning</h2>
      <p className="text-xs text-muted-foreground">
        Primary metric: {n.primaryMetric} · Window: {n.observationWindowDays} days · Lifecycle:{" "}
        {n.lifecycle}
      </p>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Variant comparison
        </h3>
        <ul className="mt-1 space-y-1 text-sm">
          {n.variantResults.map((v) => (
            <li key={v.variantId}>
              {v.variantKey}: {v.classification.replace(/_/g, " ")}
              {v.outcome != null ? ` (outcome ${v.outcome})` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2 text-xs sm:grid-cols-2">
        <p>
          <span className="font-medium">Evidence quality:</span> {n.dataQualityStatus}
        </p>
        <p>
          <span className="font-medium">Attribution:</span> {n.attributionStatus}
        </p>
      </section>

      {n.limitations[0] && (
        <p className="text-xs text-muted-foreground">{n.limitations[0]}</p>
      )}

      {interp && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Interpretation
          </h3>
          <p className="mt-1 text-sm">{interp.summary}</p>
          {interp.observations[0] && (
            <p className="mt-1 text-xs text-muted-foreground">{interp.observations[0]}</p>
          )}
        </section>
      )}
    </div>
  );
}
