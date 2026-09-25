"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { ClientStatusBadge } from "@/components/clients/client-status";
import { Button } from "@/components/ui/button";
import type { ClientWorkspaceSummary } from "@/lib/workspaces/types";

function formatCount(value?: number) {
  if (value == null || value === 0) return "—";
  return String(value);
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
    if (!confirm("Archive this client workspace?")) return;

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

      router.push("/clients");
    } catch {
      setError("Unable to archive client.");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading client…</p>;
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to clients
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error ?? "Client not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <Link
          href="/clients"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Clients
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl tracking-tight text-foreground">
                {client.name}
              </h1>
              <ClientStatusBadge status={client.status} />
            </div>
            {client.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {client.description}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground/70">
              Slug: {client.slug}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={openWorkspace} disabled={switching}>
              <ExternalLink className="size-3.5" />
              {switching ? "Opening…" : "Open workspace"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/clients/${clientId}/members`}>
                <Users className="size-3.5" />
                Members
              </Link>
            </Button>
            {client.status === "active" && (
              <Button size="sm" variant="ghost" onClick={archiveClient}>
                Archive
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Members", value: formatCount(client.memberCount) },
          { label: "Content", value: formatCount(client.contentCount) },
          { label: "Campaigns", value: formatCount(client.campaignCount) },
          { label: "Connected accounts", value: formatCount(client.accountCount) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border/70 bg-card/30 px-4 py-5"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
