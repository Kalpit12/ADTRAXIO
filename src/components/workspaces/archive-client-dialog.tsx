"use client";

import { Button } from "@/components/ui/button";

interface ArchiveClientDialogProps {
  open: boolean;
  clientName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveClientDialog({
  open,
  clientName,
  loading,
  onConfirm,
  onCancel,
}: ArchiveClientDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-client-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Archive</p>
          <h2 id="archive-client-title" className="text-lg font-semibold text-foreground">
            Archive {clientName}?
          </h2>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          The client workspace will be archived and hidden from your active list.
          Existing data is not deleted. You can restore access later if your
          process supports it.
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Keep active
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Archiving…" : "Archive workspace"}
          </Button>
        </div>
      </div>
    </div>
  );
}
