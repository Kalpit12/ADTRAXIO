"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { ConnectionError } from "@/components/social/connection-error";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { friendlyConnectionMessage } from "@/lib/social/connection-display";
import { cn } from "@/lib/utils";

interface PendingAccount {
  selectionId: string;
  platform: "facebook" | "instagram";
  accountName: string;
  username: string | null;
  profileImageUrl: string | null;
}

export function SocialAccountSelectView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [accounts, setAccounts] = useState<PendingAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Connection session missing. Start again from Social connections.");
      setLoading(false);
      return;
    }

    fetch(`/api/social/meta/pending?session=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((payload: { accounts?: PendingAccount[]; error?: string }) => {
        if (payload.error) {
          setError(payload.error);
          return;
        }
        setAccounts(payload.accounts ?? []);
        setSelected(new Set(payload.accounts?.map((a) => a.selectionId) ?? []));
      })
      .catch(() => setError("Unable to load accounts for selection."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  function toggleSelection(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConnect() {
    if (!sessionId || selected.size === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/social/meta/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          selectedSelectionIds: Array.from(selected),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(
          friendlyConnectionMessage(
            payload.error ?? "Unable to connect selected accounts."
          )
        );
        return;
      }

      router.push("/social?success=Accounts connected successfully.");
    } catch {
      setError("Unable to connect selected accounts.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8" aria-busy="true">
        <div className="space-y-3 border-b border-border/60 pb-7">
          <div className="h-3 w-32 animate-pulse rounded bg-secondary/30" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-secondary/30" />
        </div>
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-sm text-amber-100/90">Connection in progress</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Loading accounts from Meta…
          </p>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-secondary/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Social connections"
        title="Choose accounts to connect"
        description="Select the Pages or Instagram accounts ADTRAXIO should use in this workspace."
      />

      <div
        className="rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent/5 px-4 py-3"
        role="status"
      >
        <p className="text-sm font-medium text-foreground">Connection in progress</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Finish here — you do not need to start Meta sign-in again unless this
          page shows an error.
        </p>
      </div>

      {error && (
        <ConnectionError message={error} onRetry={() => window.location.reload()} />
      )}

      {accounts.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">
          No accounts were returned for this session.{" "}
          <Link href="/social" className="font-medium text-foreground hover:underline">
            Return to Social connections
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-md border border-border/60">
          {accounts.map((account) => {
            const isSelected = selected.has(account.selectionId);
            const platformLabel =
              account.platform === "facebook" ? "Facebook Page" : "Instagram";
            return (
              <li key={account.selectionId}>
                <button
                  type="button"
                  onClick={() => toggleSelection(account.selectionId)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  aria-pressed={isSelected}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-adtraxio-accent bg-adtraxio-accent/15 text-foreground"
                        : "border-border/70"
                    )}
                    aria-hidden
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                  {account.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.profileImageUrl}
                      alt=""
                      className="size-10 rounded-md border border-border/60 object-cover"
                    />
                  ) : (
                    <PlatformIcon platform={account.platform} size="sm" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {account.username
                        ? `@${account.username.replace(/^@/, "")}`
                        : account.accountName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {platformLabel}
                      {account.username && account.accountName
                        ? ` · ${account.accountName}`
                        : ""}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
        <Button
          type="button"
          disabled={submitting || selected.size === 0}
          onClick={handleConnect}
        >
          {submitting ? "Connecting…" : "Connect selected accounts"}
        </Button>
        <Button asChild type="button" variant="outline" size="sm">
          <Link href="/social">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
