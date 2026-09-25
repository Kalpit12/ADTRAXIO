import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClientStatusBadge } from "@/components/clients/client-status";
import type { ClientWorkspaceSummary } from "@/lib/workspaces/types";

function formatCount(value?: number) {
  if (value == null || value === 0) return "—";
  return String(value);
}

interface ClientRowProps {
  client: ClientWorkspaceSummary;
}

export function ClientRow({ client }: ClientRowProps) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="group flex items-center gap-4 border-b border-border/60 px-4 py-4 transition-colors hover:bg-white/[0.02] sm:px-6"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {client.name}
          </p>
          <ClientStatusBadge status={client.status} />
        </div>
        {client.description && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {client.description}
          </p>
        )}
      </div>

      <div className="hidden shrink-0 gap-6 text-xs text-muted-foreground sm:flex">
        <span>{formatCount(client.memberCount)} members</span>
        <span>{formatCount(client.contentCount)} content</span>
        <span>{formatCount(client.campaignCount)} campaigns</span>
        <span>{formatCount(client.accountCount)} accounts</span>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

export function ClientCard({ client }: ClientRowProps) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="block rounded-lg border border-border/70 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{client.name}</p>
          {client.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {client.description}
            </p>
          )}
        </div>
        <ClientStatusBadge status={client.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="text-muted-foreground/70">Members</dt>
          <dd className="text-foreground">{formatCount(client.memberCount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Content</dt>
          <dd className="text-foreground">{formatCount(client.contentCount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Campaigns</dt>
          <dd className="text-foreground">{formatCount(client.campaignCount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Accounts</dt>
          <dd className="text-foreground">{formatCount(client.accountCount)}</dd>
        </div>
      </dl>
    </Link>
  );
}
