"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { ClientCard, ClientRow } from "@/components/clients/client-row";
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

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Agency</p>
            <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
              Client workspaces
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage client environments for content, campaigns, publishing, and
              analytics — all under your agency organization.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus className="size-3.5" />
              New client
            </Link>
          </Button>
        </div>
      </header>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 px-6 py-16 text-center">
          <Users className="size-8 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium text-foreground">No clients yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a client workspace to start managing their social operations.
          </p>
          <Button asChild size="sm" className="mt-6">
            <Link href="/clients/new">Create first client</Link>
          </Button>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border/70 md:block">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border/60 bg-secondary/20 px-6 py-3 text-xs font-medium text-muted-foreground">
              <span>Client</span>
              <span className="hidden sm:inline">Overview</span>
            </div>
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>

          <div className="grid gap-3 md:hidden">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
