"use client";

import { useEffect, useState } from "react";
import type { CrossExperimentEvidenceResult } from "@/lib/evidence/types";
import type { EvidenceRelationship } from "@/lib/evidence/types";
import type { EvidenceConflictDetail } from "@/lib/evidence/types";

export function ExperimentCrossEvidenceSection({
  experimentId,
  compact,
}: {
  experimentId?: string;
  compact?: boolean;
}) {
  const [evidence, setEvidence] = useState<CrossExperimentEvidenceResult | null>(null);
  const [relationships, setRelationships] = useState<EvidenceRelationship[]>([]);
  const [conflicts, setConflicts] = useState<EvidenceConflictDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const cross = await fetch("/api/evidence/cross-experiment");
      const crossJson = (await cross.json()) as { evidence?: CrossExperimentEvidenceResult };
      setEvidence(crossJson.evidence ?? null);
      if (experimentId) {
        const rel = await fetch(
          `/api/evidence/relationships?experimentId=${experimentId}`
        );
        const relJson = (await rel.json()) as { relationships?: EvidenceRelationship[] };
        setRelationships(relJson.relationships ?? []);
        const conf = await fetch(
          `/api/evidence/conflicts?experimentId=${experimentId}`
        );
        const confJson = (await conf.json()) as { conflicts?: EvidenceConflictDetail[] };
        setConflicts(confJson.conflicts ?? []);
      }
      setLoading(false);
    })();
  }, [experimentId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading evidence…</p>;
  }
  if (!evidence) return null;

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/20 p-4">
      <h2 className="text-sm font-semibold">
        {compact ? "Cross-experiment evidence" : "Evidence & cross-experiment patterns"}
      </h2>
      <p className="text-xs text-muted-foreground">{evidence.summary}</p>
      <p className="text-xs capitalize">
        Pattern: {evidence.classification.replace(/_/g, " ")} · Sample:{" "}
        {evidence.sampleCount}
      </p>

      {evidence.supportingObservations.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Supporting observations
          </h3>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {evidence.supportingObservations.slice(0, 4).map((o) => (
              <li key={o.experimentId}>
                {o.experimentName}: variant {o.higherObservedVariantKey ?? "—"} (
                {o.metric})
              </li>
            ))}
          </ul>
        </section>
      )}

      {evidence.conflictingObservations.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conflicting observations
          </h3>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {evidence.conflictingObservations.slice(0, 4).map((o) => (
              <li key={o.experimentId}>
                {o.experimentName}: variant {o.higherObservedVariantKey ?? "—"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {experimentId && relationships.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Related evidence
          </h3>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {relationships.slice(0, 6).map((r, i) => (
              <li key={`${r.type}-${i}`}>
                {r.type}: {r.from.type} → {r.to.type} ({r.label})
              </li>
            ))}
          </ul>
        </section>
      )}

      {conflicts[0] && (
        <p className="text-xs text-muted-foreground">{conflicts[0].differences[0]}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Based on {evidence.sampleCount} completed experiment(s) in this workspace.
      </p>
    </div>
  );
}
