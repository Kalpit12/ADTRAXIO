"use client";

import { useEffect, useState } from "react";
import type { ExperimentIntelligenceSummary } from "@/lib/experiments/types";

const QUALITY_LABEL: Record<string, string> = {
  insufficient: "Insufficient",
  limited: "Limited",
  usable: "Usable",
  strong: "Strong",
};

export function ExperimentIntelligenceSections({ experimentId }: { experimentId: string }) {
  const [intel, setIntel] = useState<ExperimentIntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/experiments/${experimentId}/intelligence`);
      const payload = (await res.json()) as { intelligence?: ExperimentIntelligenceSummary };
      setIntel(payload.intelligence ?? null);
      setLoading(false);
    })();
  }, [experimentId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading experiment intelligence…</p>;
  }
  if (!intel) return null;

  const interp = intel.interpretation as {
    summary?: string;
    observations?: string[];
    interpretations?: string[];
    limitations?: string[];
    historical_context?: string[];
  };

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Experiment health
        </h3>
        <p className="mt-1 text-sm capitalize">{intel.health.status.replace(/_/g, " ")}</p>
        {intel.health.blockers[0] && (
          <p className="text-xs text-muted-foreground">{intel.health.blockers[0]}</p>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Evidence quality
        </h3>
        <p className="mt-1 text-sm">
          {QUALITY_LABEL[intel.evidenceQuality.level] ?? intel.evidenceQuality.level}
        </p>
        <p className="text-xs text-muted-foreground">{intel.evidenceQuality.summary}</p>
      </section>

      {intel.dataQuality && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Data quality
          </h3>
          <p className="mt-1 text-sm capitalize">{intel.dataQuality.status}</p>
          {intel.dataQuality.blockers[0] && (
            <p className="text-xs text-destructive">{intel.dataQuality.blockers[0]}</p>
          )}
          {intel.dataQuality.warnings[0] && (
            <p className="text-xs text-muted-foreground">{intel.dataQuality.warnings[0]}</p>
          )}
        </section>
      )}

      {intel.attribution && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attribution
          </h3>
          <p className="mt-1 text-sm capitalize">{intel.attribution.status}</p>
          <p className="text-xs text-muted-foreground">
            {intel.attribution.associations[0] ?? intel.attribution.limitations[0]}
          </p>
        </section>
      )}

      {intel.contextSnapshot && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Context snapshot
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Frozen at {intel.contextSnapshot.frozenAt} · platform{" "}
            {intel.contextSnapshot.platform ?? "—"}
          </p>
        </section>
      )}

      {intel.measurementSnapshot && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Measurement snapshot
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Measured {intel.measurementSnapshot.measuredAt} · data quality{" "}
            {intel.measurementSnapshot.dataQuality.status}
          </p>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What we observed
        </h3>
        <ul className="mt-1 list-disc pl-5 text-sm text-foreground/90">
          {intel.variantResults.map((v) => (
            <li key={v.variantId}>
              {v.variantKey}: {v.observedClassification.replace(/_/g, " ")}
              {v.outcomeValue != null ? ` (${v.outcomeValue})` : ""}
            </li>
          ))}
        </ul>
      </section>

      {intel.relatedExperiments.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Related experiments
          </h3>
          <ul className="mt-1 space-y-1 text-sm">
            {intel.relatedExperiments.map((r) => (
              <li key={r.experimentId} className="text-foreground/90">
                {r.name} — <span className="text-muted-foreground">{r.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {intel.conflictingFindings.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conflicting findings
          </h3>
          <p className="mt-1 text-sm">{intel.conflictingFindings[0].summary}</p>
        </section>
      )}

      {(interp.summary || interp.observations?.length) && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Interpretation
          </h3>
          {interp.summary && <p className="mt-1 text-sm">{interp.summary}</p>}
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Limitations
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {intel.limitations[0] ?? "Correlation is not causation."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{intel.nextConsideration}</p>
      </section>
    </div>
  );
}
