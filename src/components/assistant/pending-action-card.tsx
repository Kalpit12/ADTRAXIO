"use client";

import { Button } from "@/components/ui/button";
import type { PendingActionRecord } from "@/lib/assistant/types";

interface PendingActionCardProps {
  action: PendingActionRecord;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function actionTitle(type: PendingActionRecord["actionType"]): string {
  switch (type) {
    case "publish_post":
      return "Publish post";
    case "schedule_post":
      return "Schedule post";
    case "cancel_post":
      return "Cancel post";
    case "create_campaign":
      return "Create campaign";
    case "save_brand_memory":
      return "Save brand preference";
    default:
      return type.replaceAll("_", " ");
  }
}

function confirmLabel(type: PendingActionRecord["actionType"]): string {
  switch (type) {
    case "publish_post":
      return "Confirm publish";
    case "schedule_post":
      return "Confirm schedule";
    case "cancel_post":
      return "Confirm cancel";
    case "create_campaign":
      return "Confirm create";
    case "save_brand_memory":
      return "Save preference";
    default:
      return "Confirm";
  }
}

export function PendingActionCard({
  action,
  confirming,
  onConfirm,
  onCancel,
}: PendingActionCardProps) {
  const payload = action.payload;
  const caption =
    typeof payload.caption === "string" ? payload.caption : null;
  const scheduledFor =
    typeof payload.scheduledFor === "string" ? payload.scheduledFor : null;
  const name = typeof payload.name === "string" ? payload.name : null;
  const platform =
    typeof payload.platform === "string" ? payload.platform : null;
  const socialAccountId =
    typeof payload.socialAccountId === "string"
      ? payload.socialAccountId
      : null;

  return (
    <div className="my-4 max-w-full overflow-hidden rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-amber-400/90">
        {action.actionType === "save_brand_memory"
          ? "Save brand preference?"
          : "Ready to execute"}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">
        {actionTitle(action.actionType)}
      </p>

      {name && (
        <p className="mt-1 text-sm text-foreground/80">{name}</p>
      )}

      <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-foreground/70">Action</dt>
          <dd>{actionTitle(action.actionType)}</dd>
        </div>
        {platform && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-foreground/70">Platform</dt>
            <dd className="capitalize">{platform}</dd>
          </div>
        )}
        {socialAccountId && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-foreground/70">Account</dt>
            <dd className="truncate font-mono text-[10px]">{socialAccountId}</dd>
          </div>
        )}
        {scheduledFor && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-foreground/70">Schedule</dt>
            <dd>{new Date(scheduledFor).toLocaleString()}</dd>
          </div>
        )}
      </dl>

      {caption && (
        <div className="mt-3 max-w-full rounded-md border border-border/50 bg-background/40 p-3">
          <p className="break-words text-sm leading-relaxed text-foreground/85">
            {caption}
          </p>
        </div>
      )}

      {!caption && action.summary && (
        <p className="mt-2 break-words text-xs text-muted-foreground">
          {action.summary}
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {action.actionType === "publish_post"
          ? "This will publish immediately."
          : action.actionType === "schedule_post"
            ? "This will schedule the post."
            : "This action cannot be undone easily."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={confirming}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={confirming}>
          {confirming ? "Confirming..." : confirmLabel(action.actionType)}
        </Button>
      </div>
    </div>
  );
}
