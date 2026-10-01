"use client";

import { Button } from "@/components/ui/button";
import { formatMemberDisplayName } from "@/lib/workspaces/display";

interface RemoveMemberDialogProps {
  open: boolean;
  memberName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveMemberDialog({
  open,
  memberName,
  loading,
  onConfirm,
  onCancel,
}: RemoveMemberDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-member-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Remove access</p>
          <h2 id="remove-member-title" className="text-lg font-semibold text-foreground">
            Remove {formatMemberDisplayName({ fullName: memberName })}?
          </h2>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          They will lose access to this client workspace in ADTRAXIO. Their account
          on the social networks is not affected.
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Removing…" : "Remove member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
