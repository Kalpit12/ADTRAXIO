"use client";

import Link from "next/link";
import {
  DashboardSection,
  DashboardSectionHeader,
} from "@/components/dashboard/dashboard-panel";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { cn } from "@/lib/utils";
import type { ConnectedAccount } from "@/lib/dashboard/types";

interface ConnectedAccountsProps {
  accounts: ConnectedAccount[];
}

export function ConnectedAccounts({ accounts }: ConnectedAccountsProps) {
  return (
    <DashboardSection>
      <DashboardSectionHeader
        title="Connected Accounts"
        action={
          <Link
            href="/social"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Manage
          </Link>
        }
      />

      <ul className="mt-5 divide-y divide-border/60">
        {accounts.map((account) => (
          <li
            key={account.platform}
            className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <PlatformIcon platform={account.platform} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {account.label}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    account.connected
                      ? "text-muted-foreground"
                      : "text-muted-foreground/70"
                  )}
                >
                  {account.connected
                    ? account.username ??
                      account.accountName ??
                      "Connected"
                    : "Not connected"}
                </p>
              </div>
            </div>

            {!account.connected && (
              <Link
                href="/social"
                className="shrink-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                Connect
              </Link>
            )}
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
