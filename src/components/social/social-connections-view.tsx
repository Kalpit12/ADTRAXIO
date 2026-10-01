"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ConnectionEmptyState } from "@/components/social/connection-empty-state";
import { ConnectionError } from "@/components/social/connection-error";
import { ConnectionSkeleton } from "@/components/social/connection-skeleton";
import { DisconnectDialog } from "@/components/social/disconnect-dialog";
import { SocialConnectionCard } from "@/components/social/social-connection-card";
import { SocialPlatformList } from "@/components/social/social-platform-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS } from "@/lib/onboarding/constants";
import { friendlyConnectionMessage } from "@/lib/social/connection-display";
import type { SafeSocialAccount } from "@/lib/social/types";
import type { SocialPlatform } from "@/lib/onboarding/types";

interface SocialConfiguration {
  metaFacebook: boolean;
  metaInstagram: boolean;
  encryption: boolean;
}

const PLATFORM_SECTION_ORDER: SocialPlatform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
];

export function SocialConnectionsView() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SafeSocialAccount[]>([]);
  const [configuration, setConfiguration] = useState<SocialConfiguration>({
    metaFacebook: false,
    metaInstagram: false,
    encryption: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [pendingDisconnect, setPendingDisconnect] =
    useState<SafeSocialAccount | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canConnect =
    configuration.encryption &&
    (configuration.metaFacebook || configuration.metaInstagram);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/social/accounts");
      const payload = (await response.json()) as {
        accounts?: SafeSocialAccount[];
        configuration?: SocialConfiguration;
        error?: string;
      };

      if (!response.ok) {
        setLoadError(payload.error ?? "Unable to load social accounts.");
        return;
      }

      if (payload.accounts) setAccounts(payload.accounts);
      if (payload.configuration) setConfiguration(payload.configuration);
    } catch {
      setLoadError("Unable to load social accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      setBanner({
        type: "success",
        message: friendlyConnectionMessage(success),
      });
    } else if (error) {
      setBanner({
        type: "error",
        message: friendlyConnectionMessage(error),
      });
    }
  }, [searchParams]);

  async function confirmDisconnect() {
    if (!pendingDisconnect) return;

    const accountId = pendingDisconnect.id;
    setDisconnectingId(accountId);
    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setBanner({
          type: "error",
          message: friendlyConnectionMessage(
            payload.error ?? "Unable to disconnect account."
          ),
        });
        return;
      }
      setPendingDisconnect(null);
      setBanner({ type: "success", message: "Account disconnected." });
      await loadAccounts();
    } finally {
      setDisconnectingId(null);
    }
  }

  const connectedPlatforms = new Set(
    accounts.filter((a) => a.status === "connected").map((a) => a.platform)
  );

  const accountsByPlatform = useMemo(() => {
    const map = new Map<string, SafeSocialAccount[]>();
    for (const account of accounts) {
      const list = map.get(account.platform) ?? [];
      list.push(account);
      map.set(account.platform, list);
    }
    return map;
  }, [accounts]);

  const platformSections = PLATFORM_SECTION_ORDER.filter(
    (p) => (accountsByPlatform.get(p)?.length ?? 0) > 0
  );

  return (
    <div className="space-y-10">
      <PageHeader
        title="Social connections"
        description="Connect the accounts you use to create, publish, and understand your social growth."
      >
        {canConnect && (
          <Button asChild size="sm">
            <Link href="#available-connections">Connect account</Link>
          </Button>
        )}
      </PageHeader>

      {banner?.type === "success" && (
        <p
          className="rounded-md border border-adtraxio-accent/25 bg-adtraxio-accent/5 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {banner.message}
        </p>
      )}
      {banner?.type === "error" && (
        <ConnectionError
          message={banner.message}
          onRetry={() => setBanner(null)}
        />
      )}

      {loadError && (
        <ConnectionError message={loadError} onRetry={() => void loadAccounts()} />
      )}

      {!configuration.encryption && (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
          Account connections are not available until your workspace administrator
          completes server setup.
        </p>
      )}

      <section aria-labelledby="connected-accounts-heading">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Connected
          </p>
          <h2
            id="connected-accounts-heading"
            className="font-heading text-lg tracking-tight text-foreground"
          >
            Your accounts
          </h2>
        </div>

        {loading ? (
          <div className="mt-5">
            <ConnectionSkeleton />
          </div>
        ) : accounts.length === 0 ? (
          <div className="mt-5">
            <ConnectionEmptyState canConnect={canConnect} />
          </div>
        ) : (
          <div className="mt-5 space-y-8">
            {platformSections.map((platform) => {
              const platformAccounts = accountsByPlatform.get(platform) ?? [];
              const label = PLATFORM_LABELS[platform] ?? platform;
              return (
                <div key={platform}>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </h3>
                  <ul className="space-y-3">
                    {platformAccounts.map((account) => (
                      <SocialConnectionCard
                        key={account.id}
                        account={account}
                        onDisconnect={() => setPendingDisconnect(account)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="available-connections"
        className="scroll-mt-8 border-t border-border/60 pt-10"
        aria-labelledby="available-connections-heading"
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Add connection
          </p>
          <h2
            id="available-connections-heading"
            className="font-heading text-lg tracking-tight text-foreground"
          >
            Available platforms
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Only platforms supported by your workspace appear below. You will sign
            in with the provider to authorize ADTRAXIO — we never show your
            password here.
          </p>
        </div>
        <SocialPlatformList
          configuration={configuration}
          connectedPlatforms={connectedPlatforms}
        />
      </section>

      <DisconnectDialog
        open={pendingDisconnect != null}
        account={pendingDisconnect}
        loading={disconnectingId != null}
        onConfirm={() => void confirmDisconnect()}
        onCancel={() => setPendingDisconnect(null)}
      />
    </div>
  );
}
