"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type HistoryRow = {
  optimizationProposalId: string;
  experimentId: string;
  platform: string | null;
  previousAllocation: Record<string, number>;
  executedAllocation: Record<string, number>;
  metric: string;
  observedResult: string | null;
  evidenceQuality: string | null;
  status: string;
  executedAt: string;
};

function formatAlloc(map: Record<string, number>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k} ${v}%`)
    .join(" · ");
}

export function OptimizationHistoryView() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [metric, setMetric] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (platform) params.set("platform", platform);
    if (metric) params.set("metric", metric);
    const res = await fetch(`/api/optimization/outcomes?${params.toString()}`);
    const payload = (await res.json()) as { outcomes?: HistoryRow[] };
    setRows(payload.outcomes ?? []);
    setLoading(false);
  }, [status, platform, metric]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <h1 className="text-lg font-semibold">Optimization outcome history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Post-execution measurements only. Execution success is separate from observed results.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="measured">measured</option>
            <option value="evaluated">evaluated</option>
            <option value="inconclusive">inconclusive</option>
            <option value="insufficient_data">insufficient_data</option>
          </select>
          <select
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">All platforms</option>
            <option value="instagram">instagram</option>
            <option value="facebook">facebook</option>
          </select>
          <input
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
            placeholder="metric filter"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          />
        </div>
      </div>
      <div className="p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No optimization outcomes yet.</p>
        )}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.optimizationProposalId}>
              <Link
                href={`/assistant/optimization/${r.optimizationProposalId}`}
                className="block rounded-xl border border-border/60 p-4 hover:bg-muted/30"
              >
                <p className="font-medium text-sm">
                  {formatAlloc(r.previousAllocation)} → {formatAlloc(r.executedAllocation)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Experiment {r.experimentId.slice(0, 8)}… · {r.metric || "—"} ·{" "}
                  {r.observedResult?.replace(/_/g, " ") ?? "pending"} · evidence{" "}
                  {r.evidenceQuality ?? "—"} · {r.status}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.executedAt).toLocaleString()}
                  {r.platform ? ` · ${r.platform}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
