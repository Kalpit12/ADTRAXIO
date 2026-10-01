"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ClientCard, ClientRow } from "@/components/clients/client-row";
import { PageHeader } from "@/components/layout/page-header";
import { WorkspaceEmptyState } from "@/components/workspaces/workspace-empty-state";
import { WorkspaceError } from "@/components/workspaces/workspace-error";
import { WorkspaceListSkeleton } from "@/components/workspaces/workspace-skeleton";
import { Button } from "@/components/ui/button";
import type { ClientWorkspaceSummary } from "@/lib/workspaces/types";

export function ClientsView() {
  const [clients, setClients] = useState<ClientWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clients");
      const payload = (await response.json()) as {
        clients?: ClientWorkspaceSummary[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load clients.");
        return;
      }

      setClients(payload.clients ?? []);
    } catch {
      setError("Unable to load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const activeCount = clients.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Agency workspace"
        title="Your agency"
        description="Manage clients, people, campaigns, approvals, and shared growth work from one workspace."
      >
        <Button asChild size="sm">
          <Link href="/clients/new">
            <Plus className="size-3.5" />
            Add client
          </Link>
        </Button>
      </PageHeader>

      <section aria-labelledby="clients-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Clients
            </p>
            <h2
              id="clients-list-heading"
              className="font-heading text-lg tracking-tight text-foreground"
            >
              Client workspaces
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage the businesses and teams your agency works with.
            </p>
          </div>
          {!loading && clients.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {activeCount} active workspace{activeCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {loading && (
          <div className="mt-5">
            <WorkspaceListSkeleton />
          </div>
        )}

        {error && (
          <div className="mt-5">
            <WorkspaceError message={error} onRetry={() => void loadClients()} />
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <div className="mt-5">
            <WorkspaceEmptyState
              title="No client workspaces yet"
              description="Create a dedicated environment for each client's content, campaigns, publishing, and analytics."
              actionHref="/clients/new"
              actionLabel="Add client"
            />
          </div>
        )}

        {!loading && !error && clients.length > 0 && (
          <div className="mt-5">
            <div className="hidden overflow-hidden rounded-md border border-border/60 md:block">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border/60 bg-adtraxio-surface/10 px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>Client</span>
                <span className="hidden sm:grid sm:grid-cols-4 sm:gap-6">
                  <span>Members</span>
                  <span>Content</span>
                  <span>Campaigns</span>
                  <span>Accounts</span>
                </span>
              </div>
              <ul>
                {clients.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </ul>
            </div>

            <ul className="space-y-3 md:hidden">
              {clients.map((client) => (
                <li key={client.id}>
                  <ClientCard client={client} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="border-t border-border/60 pt-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Quick actions
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/clients/new">Add client</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings">Workspace settings</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
