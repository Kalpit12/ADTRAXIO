"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientStatusBadge } from "@/components/clients/client-status";
import { PageHeader } from "@/components/layout/page-header";
import { ArchiveClientDialog } from "@/components/workspaces/archive-client-dialog";
import { WorkspaceError } from "@/components/workspaces/workspace-error";
import { Button } from "@/components/ui/button";
import type { ClientWorkspaceSummary } from "@/lib/workspaces/types";

function formatCount(value?: number) {
  if (value == null || value === 0) return "—";
  return String(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ClientDetailViewProps {
  clientId: string;
}

export function ClientDetailView({ clientId }: ClientDetailViewProps) {
  const router = useRouter();
  const [client, setClient] = useState<ClientWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const payload = (await response.json()) as {
        client?: ClientWorkspaceSummary;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load client.");
        return;
      }

      setClient(payload.client ?? null);
    } catch {
      setError("Unable to load client.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  async function openWorkspace() {
    setSwitching(true);
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientWorkspaceId: clientId }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to switch workspace.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to switch workspace.");
    } finally {
      setSwitching(false);
    }
  }

  async function archiveClient() {
    setArchiving(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to archive client.");
        return;
      }

      setShowArchive(false);
      router.push("/clients");
    } catch {
      setError("Unable to archive client.");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-24 animate-pulse rounded-md bg-secondary/20" />
        <div className="h-32 animate-pulse rounded-md bg-secondary/15" />
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="space-y-4">
        <Link
          href="/clients"
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          ← Client workspaces
        </Link>
        <WorkspaceError message={error} onRetry={() => void loadClient()} />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="space-y-10">
      <Link
        href="/clients"
        className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        ← Client workspaces
      </Link>

      <PageHeader title={client.name} description={client.description ?? undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <ClientStatusBadge status={client.status} />
          <Button size="sm" onClick={openWorkspace} disabled={switching}>
            {switching ? "Opening…" : "Open client workspace"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/clients/${clientId}/members`}>Team</Link>
          </Button>
          {client.status === "active" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setShowArchive(true)}
            >
              Archive
            </Button>
          )}
        </div>
      </PageHeader>

      {error && <WorkspaceError message={error} />}

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Overview
        </p>
        <dl className="mt-3 grid divide-y divide-border/50 rounded-md border border-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            { label: "Members", value: formatCount(client.memberCount) },
            { label: "Content", value: formatCount(client.contentCount) },
            { label: "Campaigns", value: formatCount(client.campaignCount) },
            { label: "Connected accounts", value: formatCount(client.accountCount) },
          ].map((item) => (
            <div key={item.label} className="px-4 py-4">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 font-heading text-2xl tabular-nums text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Created {formatDate(client.createdAt)}
        </p>
      </section>

      <ArchiveClientDialog
        open={showArchive}
        clientName={client.name}
        loading={archiving}
        onConfirm={() => void archiveClient()}
        onCancel={() => setShowArchive(false)}
      />
    </div>
  );
}
