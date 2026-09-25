"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";
import type { SafeSocialAccount } from "@/lib/social/types";
import { cn } from "@/lib/utils";

interface SocialAccountRowProps {
  account: SafeSocialAccount;
  disconnecting: boolean;
  onDisconnect: () => void;
}

export function SocialAccountRow({
  account,
  disconnecting,
  onDisconnect,
}: SocialAccountRowProps) {
  const platformLabel =
    PLATFORM_LABELS[account.platform as SocialPlatform] ?? account.platform;

  const lastConnected = account.lastSyncedAt ?? account.updatedAt;

  return (
    <li className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {account.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.profileImageUrl}
            alt=""
            className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
          />
        ) : (
          <PlatformIcon platform={account.platform} size="md" />
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {account.accountName ?? platformLabel}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {platformLabel}
            {account.username ? ` · ${account.username}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Last connected{" "}
            {new Date(lastConnected).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:shrink-0">
        <span
          className={cn(
            "text-xs font-medium capitalize",
            account.status === "connected"
              ? "text-adtraxio-accent"
              : "text-muted-foreground"
          )}
        >
          {account.status}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disconnecting}
          onClick={onDisconnect}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    </li>
  );
}
