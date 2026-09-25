"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SocialAccountRow } from "@/components/social/social-account-row";
import { SocialPlatformList } from "@/components/social/social-platform-list";
import type { SafeSocialAccount } from "@/lib/social/types";

interface SocialConfiguration {
  metaFacebook: boolean;
  metaInstagram: boolean;
  encryption: boolean;
}

export function SocialConnectionsView() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SafeSocialAccount[]>([]);
  const [configuration, setConfiguration] = useState<SocialConfiguration>({
    metaFacebook: false,
    metaInstagram: false,
    encryption: false,
  });
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/social/accounts");
      const payload = (await response.json()) as {
        accounts?: SafeSocialAccount[];
        configuration?: SocialConfiguration;
        error?: string;
      };

      if (payload.accounts) setAccounts(payload.accounts);
      if (payload.configuration) setConfiguration(payload.configuration);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      setBanner({ type: "success", message: success });
    } else if (error) {
      setBanner({ type: "error", message: error });
    }
  }, [searchParams]);

  async function handleDisconnect(accountId: string) {
    if (!window.confirm("Disconnect this account from ADTRAXIO?")) return;

    setDisconnectingId(accountId);
    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setBanner({
          type: "error",
          message: payload.error ?? "Unable to disconnect account.",
        });
        return;
      }
      setBanner({ type: "success", message: "Account disconnected." });
      await loadAccounts();
    } finally {
      setDisconnectingId(null);
    }
  }

  const connectedPlatforms = new Set(
    accounts.filter((a) => a.status === "connected").map((a) => a.platform)
  );

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Social</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
          Social accounts
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Connect your social channels to manage your presence from ADTRAXIO.
        </p>
      </header>

      {banner && (
        <p
          className={
            banner.type === "success"
              ? "text-sm text-adtraxio-accent"
              : "rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300"
          }
          role="status"
        >
          {banner.message}
        </p>
      )}

      {!configuration.encryption && (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
          Social token encryption is not configured yet. Add{" "}
          <code className="text-amber-100">SOCIAL_TOKEN_ENCRYPTION_KEY</code>{" "}
          to your server environment.
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Connected accounts
        </h2>

        {loading ? (
          <div className="mt-5 h-24 animate-pulse rounded-md bg-secondary/30" />
        ) : accounts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No social accounts connected.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-border/60">
            {accounts.map((account) => (
              <SocialAccountRow
                key={account.id}
                account={account}
                disconnecting={disconnectingId === account.id}
                onDisconnect={() => handleDisconnect(account.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border/60 pt-10">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Available platforms
        </h2>
        <SocialPlatformList
          configuration={configuration}
          connectedPlatforms={connectedPlatforms}
        />
      </section>
    </div>
  );
}
