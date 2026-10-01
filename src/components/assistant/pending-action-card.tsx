"use client";

import { Button } from "@/components/ui/button";
import {
  ActionStatusBadge,
  pendingActionVisualStatus,
} from "@/components/copilot/action-status-badge";
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
    case "execute_optimization":
      return "Execute optimization";
    case "rollback_optimization":
      return "Rollback optimization";
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
    case "execute_optimization":
      return "Confirm execution";
    case "rollback_optimization":
      return "Confirm rollback";
    default:
      return "Confirm";
  }
}

function consequenceCopy(type: PendingActionRecord["actionType"]): string {
  switch (type) {
    case "publish_post":
      return "This will publish immediately to the connected account.";
    case "schedule_post":
      return "This will schedule the post for the time shown.";
    case "cancel_post":
      return "This will cancel the scheduled or pending post.";
    case "save_brand_memory":
      return "This will save a preference to Brand Brain after you confirm.";
    default:
      return "Review the details below before confirming.";
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

  return (
    <div
      className="my-5 max-w-full overflow-hidden rounded-md border border-border/70 bg-adtraxio-surface/20"
      role="region"
      aria-label="Action awaiting confirmation"
    >
      <div className="border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {actionTitle(action.actionType)}
          </p>
          <ActionStatusBadge status={pendingActionVisualStatus(action.status)} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {consequenceCopy(action.actionType)}
        </p>
      </div>

      <div className="space-y-3 px-4 py-4 text-sm sm:px-5">
        {name && <p className="font-medium text-foreground">{name}</p>}

        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          {platform && (
            <div>
              <dt className="text-muted-foreground">Platform</dt>
              <dd className="capitalize text-foreground">{platform}</dd>
            </div>
          )}
          {scheduledFor && (
            <div>
              <dt className="text-muted-foreground">When</dt>
              <dd className="text-foreground">
                {new Date(scheduledFor).toLocaleString()}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="text-foreground">
              {new Date(action.createdAt).toLocaleString()}
            </dd>
          </div>
        </dl>

        {caption && (
          <div className="rounded border border-border/50 bg-background/30 p-3">
            <p className="break-words text-sm leading-relaxed text-foreground/90">
              {caption}
            </p>
          </div>
        )}

        {!caption && action.summary && (
          <p className="break-words text-sm text-muted-foreground">
            {action.summary}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/50 px-4 py-3 sm:px-5">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={confirming}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={confirming}>
          {confirming ? "Confirming…" : confirmLabel(action.actionType)}
        </Button>
      </div>
    </div>
  );
}
