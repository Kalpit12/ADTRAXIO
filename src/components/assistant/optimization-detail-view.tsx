"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OptimizationProposalRecord } from "@/lib/optimization/types";

export function OptimizationDetailView({ proposalId }: { proposalId: string }) {
  const [proposal, setProposal] = useState<OptimizationProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/optimization/proposals/${proposalId}`);
    const payload = (await res.json()) as { proposal?: OptimizationProposalRecord; error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Unable to load proposal.");
      setProposal(null);
    } else {
      setProposal(payload.proposal ?? null);
      setError(null);
    }
    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReview() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/optimization/proposals/${proposalId}/review`, { method: "POST" });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) setError(payload.error ?? "Review failed.");
    else await load();
    setBusy(false);
  }

  async function approve() {
    setBusy(true);
    setError(null);
    const confirmHighRisk = proposal?.risk.requiresExtraConfirmation ?? false;
    const res = await fetch(`/api/optimization/proposals/${proposalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmHighRisk }),
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) setError(payload.error ?? "Approval failed.");
    else await load();
    setBusy(false);
  }

  async function execute() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/optimization/proposals/${proposalId}/execute`, { method: "POST" });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) setError(payload.error ?? "Execution failed.");
    else {
      setConfirmExecute(false);
      await load();
    }
    setBusy(false);
  }

  async function rollback() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/optimization/proposals/${proposalId}/rollback`, { method: "POST" });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) setError(payload.error ?? "Rollback failed.");
    else {
      setConfirmRollback(false);
      await load();
    }
    setBusy(false);
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!proposal) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error ?? "Not found."}</p>
        <Link href="/assistant/optimization" className="mt-4 inline-block text-sm text-primary">
          Back to list
        </Link>
      </div>
    );
  }

  const isAllocation = proposal.proposalType === "allocation_change";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="border-b border-border/60 px-6 py-4">
        <Link
          href="/assistant/optimization"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Optimization
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold capitalize">
              {proposal.proposalType.replace(/_/g, " ")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: {proposal.status} · Risk: {proposal.risk.level}
            </p>
            {proposal.execution?.message && (
              <p className="mt-1 text-xs text-muted-foreground">{proposal.execution.message}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {proposal.status === "draft" && (
              <Button size="sm" disabled={busy} onClick={() => void submitReview()}>
                Review
              </Button>
            )}
            {proposal.status === "review" && (
              <Button size="sm" disabled={busy} onClick={() => void approve()}>
                Approve
              </Button>
            )}
            {proposal.status === "approved" && isAllocation && !confirmExecute && (
              <Button size="sm" disabled={busy} onClick={() => setConfirmExecute(true)}>
                Execute approved change
              </Button>
            )}
            {proposal.status === "executed" && isAllocation && !confirmRollback && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmRollback(true)}>
                Rollback
              </Button>
            )}
          </div>
        </div>
        {confirmExecute && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
            <p className="font-medium">Apply this allocation change?</p>
            <p className="mt-1 text-muted-foreground">
              Experiment {proposal.sourceId}. Rollback is available if the live allocation still
              matches the executed state.
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-background/80 p-2 text-xs">
              {JSON.stringify(
                {
                  current: proposal.currentState.allocations,
                  approved: proposal.proposedState.allocations,
                },
                null,
                2
              )}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void execute()}>
                Confirm apply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmExecute(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {confirmRollback && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
            <p className="font-medium">Restore previous allocation?</p>
            <p className="mt-1 text-muted-foreground">
              This restores the allocation captured before execution. Blocked if the experiment was
              changed manually since execution.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void rollback()}>
                Confirm rollback
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRollback(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="space-y-6 p-6 text-sm">
        {isAllocation && (
          <Section title="Allocation">
            <AllocationTable
              label="Current (recorded)"
              allocations={proposal.currentState.allocations as Record<string, number>}
            />
            <AllocationTable
              label="Approved"
              allocations={proposal.proposedState.allocations as Record<string, number>}
            />
            {proposal.execution && (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  Executed {new Date(proposal.execution.executedAt).toLocaleString()}
                </p>
                <AllocationTable
                  label="Executed"
                  allocations={proposal.execution.executedAllocation}
                />
              </>
            )}
            {proposal.outcome && (
              <div className="mt-4 rounded-lg border border-border/50 p-3">
                <p className="text-xs font-medium">Outcome (post-measurement)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {proposal.outcome.executionSummary}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {proposal.outcome.outcomeSummary}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {proposal.outcome.status} · evidence {proposal.outcome.evidenceQuality ?? "—"}{" "}
                  · attribution {proposal.outcome.attributionStatus ?? "—"}
                </p>
              </div>
            )}
          </Section>
        )}

        <Section title="Eligibility">
          <p className="capitalize">{proposal.eligibility.status}</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {proposal.eligibility.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>

        <Section title="Projected change">
          <ul className="list-disc pl-5 text-muted-foreground">
            {proposal.simulation.expectedDifference.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>

        <Section title="Approval">
          <p className="text-muted-foreground">
            {proposal.approvedBy
              ? `Approved by ${proposal.approvedBy} at ${proposal.approvedAt ? new Date(proposal.approvedAt).toLocaleString() : "—"}`
              : "Not approved yet."}
          </p>
        </Section>

        <Section title="Limitations">
          <ul className="list-disc pl-5 text-muted-foreground">
            {proposal.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Section>

        <Section title="Expiration">
          <p>{new Date(proposal.expiresAt).toLocaleString()}</p>
        </Section>

        <Section title="Audit history">
          <ul className="space-y-2 text-xs text-muted-foreground">
            {proposal.auditLog.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                {e.event ? `${e.event} · ` : ""}
                {e.at} · {e.actorId} · {e.previousStatus ?? "—"} → {e.newStatus}: {e.reason}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function AllocationTable({
  label,
  allocations,
}: {
  label: string;
  allocations?: Record<string, number>;
}) {
  if (!allocations) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="mt-1 list-disc pl-5">
        {Object.entries(allocations).map(([k, v]) => (
          <li key={k}>
            Variant {k}: {v}%
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
