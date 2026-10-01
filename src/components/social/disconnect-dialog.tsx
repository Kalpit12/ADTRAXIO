"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";
import type { SafeSocialAccount } from "@/lib/social/types";

interface DisconnectDialogProps {
  open: boolean;
  account: SafeSocialAccount | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function accountTitle(account: SafeSocialAccount): string {
  if (account.username) {
    const handle = account.username.replace(/^@/, "");
    return `@${handle}`;
  }
  return account.accountName ?? PLATFORM_LABELS[account.platform as SocialPlatform] ?? account.platform;
}

export function DisconnectDialog({
  open,
  account,
  loading,
  onConfirm,
  onCancel,
}: DisconnectDialogProps) {
  if (!open || !account) return null;

  const platformLabel =
    PLATFORM_LABELS[account.platform as SocialPlatform] ?? account.platform;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disconnect-dialog-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Disconnect</p>
          <h2 id="disconnect-dialog-title" className="text-lg font-semibold text-foreground">
            Remove this connection?
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm">
          <div className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-3">
            <PlatformIcon platform={account.platform} size="sm" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">{accountTitle(account)}</p>
              <p className="text-xs text-muted-foreground">{platformLabel}</p>
            </div>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            ADTRAXIO will stop publishing and syncing analytics for this account.
            Existing scheduled posts and published content are not deleted on the
            social network.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            Keep connected
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Disconnecting…" : "Disconnect account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
