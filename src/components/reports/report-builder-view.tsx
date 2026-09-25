"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Archive, Loader2, Printer, Save, Sparkles } from "lucide-react";
import { ReportDisplay } from "@/components/reports/report-display";
import {
  formatReportDateTime,
} from "@/components/reports/format";
import {
  ReportStatusBadge,
  ReportVisibilityBadge,
} from "@/components/reports/report-status-badge";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { Button } from "@/components/ui/button";
import { REPORT_PLATFORMS } from "@/lib/reporting/constants";
import type {
  ReportRecord,
  ReportSnapshotData,
  ReportSnapshotRecord,
} from "@/lib/reporting/types";
import { cn } from "@/lib/utils";

const fieldClassName =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40";

type ReportBuilderViewProps = {
  reportId?: string;
};

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function ReportBuilderView({ reportId }: ReportBuilderViewProps) {
  const router = useRouter();
  const isNew = !reportId;
  const range = defaultDateRange();

  const [report, setReport] = useState<ReportRecord | null>(null);
  const [snapshots, setSnapshots] = useState<ReportSnapshotRecord[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<ReportSnapshotData | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dateFrom, setDateFrom] = useState(range.from);
  const [dateTo, setDateTo] = useState(range.to);
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [includeCampaigns, setIncludeCampaigns] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);
  const [includePlatforms, setIncludePlatforms] = useState(true);
  const [includeAiSummary, setIncludeAiSummary] = useState(true);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = report?.status !== "archived" && report?.status !== "published";

  const loadReport = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);

    try {
      const [reportRes, snapshotsRes] = await Promise.all([
        fetch(`/api/reports/${reportId}`),
        fetch(`/api/reports/${reportId}/snapshots`),
      ]);

      const reportPayload = (await reportRes.json()) as {
        report?: ReportRecord;
        error?: string;
      };
      const snapshotsPayload = (await snapshotsRes.json()) as {
        snapshots?: ReportSnapshotRecord[];
        error?: string;
      };

      if (!reportRes.ok) {
        setError(reportPayload.error ?? "Unable to load report.");
        return;
      }

      const loaded = reportPayload.report!;
      setReport(loaded);
      setName(loaded.name);
      setDescription(loaded.description ?? "");
      setDateFrom(loaded.dateFrom);
      setDateTo(loaded.dateTo);
      setVisibility(loaded.visibility);
      setPlatforms(loaded.platforms);
      setIncludeCampaigns(loaded.includeCampaigns);
      setIncludeContent(loaded.includeContent);
      setIncludePlatforms(loaded.includePlatforms);
      setIncludeAiSummary(loaded.includeAiSummary);

      const list = snapshotsPayload.snapshots ?? [];
      setSnapshots(list);

      if (list.length > 0) {
        setSelectedSnapshotId(list[0].id);
        setActiveSnapshot(list[0].data);
      }

      if (loaded.status === "published") {
        void fetch(`/api/reports/${reportId}/view`, { method: "POST" });
      }
    } catch {
      setError("Unable to load report.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function saveDraft() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      name,
      description: description || null,
      dateFrom,
      dateTo,
      visibility,
      platforms,
      includeCampaigns,
      includeContent,
      includePlatforms,
      includeAiSummary,
    };

    try {
      const response = await fetch(isNew ? "/api/reports" : `/api/reports/${reportId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { report?: ReportRecord; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to save report.");
        return;
      }

      setMessage("Draft saved.");
      if (isNew && data.report) {
        router.push(`/reports/${data.report.id}`);
        return;
      }
      if (data.report) setReport(data.report);
    } catch {
      setError("Unable to save report.");
    } finally {
      setSaving(false);
    }
  }

  async function generateSnapshot() {
    if (generating) return;
    if (!reportId) {
      setError("Save the report draft before generating.");
      return;
    }

    setGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/generate`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        snapshot?: ReportSnapshotRecord;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to generate report.");
        return;
      }

      if (data.snapshot) {
        setSnapshots((prev) => [data.snapshot!, ...prev]);
        setSelectedSnapshotId(data.snapshot.id);
        setActiveSnapshot(data.snapshot.data);
        setMessage("Report generated.");
      }
    } catch {
      setError("Unable to generate report.");
    } finally {
      setGenerating(false);
    }
  }

  async function publishReport() {
    if (publishing) return;
    if (!reportId) return;
    setPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/publish`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        report?: ReportRecord;
        snapshot?: ReportSnapshotRecord;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to publish report.");
        return;
      }

      if (data.report) setReport(data.report);
      if (data.snapshot) {
        setSnapshots((prev) => [data.snapshot!, ...prev.filter((s) => s.id !== data.snapshot!.id)]);
        setSelectedSnapshotId(data.snapshot.id);
        setActiveSnapshot(data.snapshot.data);
      }
      setMessage("Report published.");
    } catch {
      setError("Unable to publish report.");
    } finally {
      setPublishing(false);
    }
  }

  async function archiveReport() {
    if (archiving) return;
    if (!reportId) return;
    if (!window.confirm("Archive this report? It will no longer appear in client lists.")) {
      return;
    }
    setArchiving(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/archive`, {
        method: "POST",
      });
      const data = (await response.json()) as { report?: ReportRecord; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to archive report.");
        return;
      }

      if (data.report) setReport(data.report);
      setMessage("Report archived.");
    } catch {
      setError("Unable to archive report.");
    } finally {
      setArchiving(false);
    }
  }

  function togglePlatform(platform: string) {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  function selectSnapshot(id: string) {
    const snapshot = snapshots.find((s) => s.id === id);
    if (snapshot) {
      setSelectedSnapshotId(id);
      setActiveSnapshot(snapshot.data);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showBuilder = isNew || (report && report.status === "draft");

  return (
    <div className="space-y-10">
      <header className="no-print border-b border-border/60 pb-6">
        <Link
          href="/reports"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to reports
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {isNew ? "New report" : "Report"}
            </p>
            <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground">
              {isNew ? "Create client report" : report?.name}
            </h1>
            {report && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ReportStatusBadge status={report.status} />
                <ReportVisibilityBadge visibility={report.visibility} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew && report && (
              <AskAdtraxioLink
                variant="button"
                label="Explain this report"
                reportId={reportId}
                prompt={`Explain report "${report.name}". Use get_report_context first.`}
              />
            )}
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save draft
              </Button>
            )}
            {!isNew && report?.status !== "archived" && (
              <Button size="sm" variant="secondary" onClick={() => void generateSnapshot()} disabled={generating}>
                {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Generate
              </Button>
            )}
            {!isNew && report?.status === "draft" && (
              <Button size="sm" onClick={() => void publishReport()} disabled={publishing}>
                {publishing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Publish
              </Button>
            )}
            {!isNew && report?.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={() => void archiveReport()} disabled={archiving}>
                <Archive className="size-3.5" />
                Archive
              </Button>
            )}
            {activeSnapshot && (
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="size-3.5" />
                Print
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <p className="no-print rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="no-print rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent/5 px-3 py-2 text-sm text-adtraxio-accent">
          {message}
        </p>
      )}

      {showBuilder && (
        <section className="no-print space-y-6 rounded-lg border border-border/60 p-5">
          <h2 className="font-heading text-lg tracking-tight">Report settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="report-name" className="text-sm font-medium text-foreground">
                Report name
              </label>
              <input
                id="report-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Monthly performance — March 2026"
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="report-description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional context for the client"
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date-from" className="text-sm font-medium text-foreground">
                From
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date-to" className="text-sm font-medium text-foreground">
                To
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Visibility</span>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "internal" | "client")}
                className="flex h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
              >
                <option value="internal">Internal (agency only)</option>
                <option value="client">Client (shared with client workspace)</option>
              </select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Platforms</span>
              <div className="flex flex-wrap gap-2">
                {REPORT_PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                      platforms.length === 0 || platforms.includes(platform)
                        ? "border-adtraxio-accent/40 bg-adtraxio-accent/10 text-adtraxio-accent"
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    {platform}
                  </button>
                ))}
                <span className="self-center text-xs text-muted-foreground">
                  {platforms.length === 0 ? "All platforms" : "Selected only"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Campaigns", includeCampaigns, setIncludeCampaigns],
              ["Content", includeContent, setIncludeContent],
              ["Platform breakdown", includePlatforms, setIncludePlatforms],
              ["AI summary", includeAiSummary, setIncludeAiSummary],
            ].map(([label, value, setter]) => (
              <label
                key={label as string}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="rounded border-border/60"
                />
                {label as string}
              </label>
            ))}
          </div>
        </section>
      )}

      {!isNew && snapshots.length > 0 && (
        <section className="no-print space-y-3">
          <h2 className="font-heading text-lg tracking-tight">Report history</h2>
          <div className="flex flex-wrap gap-2">
            {snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => selectSnapshot(snapshot.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-colors",
                  selectedSnapshotId === snapshot.id
                    ? "border-adtraxio-accent/40 bg-adtraxio-accent/10 text-adtraxio-accent"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {formatReportDateTime(snapshot.generatedAt)}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeSnapshot ? (
        <ReportDisplay snapshot={activeSnapshot} />
      ) : (
        !isNew && (
          <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No generated snapshot yet. Save your draft and click Generate to build
              the report from live analytics.
            </p>
          </div>
        )
      )}
    </div>
  );
}
