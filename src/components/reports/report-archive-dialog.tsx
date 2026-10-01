"use client";

import { Button } from "@/components/ui/button";

export function ReportArchiveDialog({
  open,
  reportName,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  reportName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-report-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Archive</p>
          <h2 id="archive-report-title" className="text-lg font-semibold text-foreground">
            Archive {reportName}?
          </h2>
        </div>
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Archived reports stay in your workspace but are hidden from default client
          lists. Snapshots are not deleted.
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Keep report
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Archiving…" : "Archive report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
