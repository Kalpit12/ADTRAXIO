"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
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
      setError("Connection session missing.");
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
        setError(payload.error ?? "Unable to connect selected accounts.");
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
      <div className="h-40 animate-pulse rounded-md bg-secondary/30" />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Social</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Select accounts to connect
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose which accounts ADTRAXIO should connect to your workspace.
        </p>
      </header>

      {error && (
        <p
          className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <ul className="divide-y divide-border/60">
        {accounts.map((account) => {
          const isSelected = selected.has(account.selectionId);
          return (
            <li key={account.selectionId}>
              <button
                type="button"
                onClick={() => toggleSelection(account.selectionId)}
                className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:text-foreground"
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
                    {account.platform === "facebook" ? "Facebook" : "Instagram"}{" "}
                    — {account.accountName}
                  </p>
                  {account.username && (
                    <p className="text-xs text-muted-foreground">
                      {account.username}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
        <Button
          type="button"
          className="bg-adtraxio-accent hover:bg-adtraxio-accent/90"
          disabled={submitting || selected.size === 0}
          onClick={handleConnect}
        >
          {submitting ? "Connecting…" : "Connect selected accounts"}
        </Button>
        <Button asChild type="button" variant="ghost" size="sm">
          <Link href="/social">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
