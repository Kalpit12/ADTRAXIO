"use client";

import { useState } from "react";
import Link from "next/link";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { CapabilityList } from "@/components/social/capability-list";
import { SocialConnectionStatus } from "@/components/social/social-connection-status";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";
import {
  getAccountCapabilities,
  getReconnectHref,
} from "@/lib/social/connection-display";
import type { SafeSocialAccount } from "@/lib/social/types";

interface SocialConnectionCardProps {
  account: SafeSocialAccount;
  onDisconnect: () => void;
}

function accountPrimaryLabel(account: SafeSocialAccount): string {
  if (account.username) {
    const handle = account.username.replace(/^@/, "");
    return `@${handle}`;
  }
  return (
    account.accountName ??
    PLATFORM_LABELS[account.platform as SocialPlatform] ??
    account.platform
  );
}

function accountSecondaryLabel(account: SafeSocialAccount): string | null {
  const platformLabel =
    PLATFORM_LABELS[account.platform as SocialPlatform] ?? account.platform;

  if (account.username && account.accountName) {
    return `${platformLabel} · ${account.accountName}`;
  }
  return platformLabel;
}

export function SocialConnectionCard({
  account,
  onDisconnect,
}: SocialConnectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const capabilities = getAccountCapabilities(account.platform, account.status);
  const reconnectHref = getReconnectHref(account.platform);
  const needsReconnect =
    account.status === "expired" || account.status === "error";

  const lastConnected = account.lastSyncedAt ?? account.updatedAt;

  return (
    <li className="rounded-md border border-border/60 bg-adtraxio-surface/5">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {account.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.profileImageUrl}
              alt=""
              className="size-11 shrink-0 rounded-md border border-border/60 object-cover"
            />
          ) : (
            <PlatformIcon platform={account.platform} size="md" />
          )}

          <div className="min-w-0">
            <p className="truncate font-heading text-base tracking-tight text-foreground">
              {accountPrimaryLabel(account)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {accountSecondaryLabel(account)}
            </p>
            <div className="mt-3">
              <SocialConnectionStatus status={account.status} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide details" : "Manage"}
          </Button>
          {needsReconnect && reconnectHref && (
            <Button asChild size="sm">
              <a href={reconnectHref}>Reconnect</a>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-4 text-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            What ADTRAXIO can do
          </p>
          <CapabilityList capabilities={capabilities} className="mt-2" />
          {needsReconnect && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This connection needs to be refreshed before ADTRAXIO can continue
              using it for publishing and analytics.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Last activity{" "}
            {new Date(lastConnected).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            <Link href="/publishing" className="font-medium text-foreground hover:underline">
              Publishing
            </Link>
            {" · "}
            <Link href="/analytics" className="font-medium text-foreground hover:underline">
              Analytics
            </Link>
          </p>
        </div>
      )}
    </li>
  );
}
