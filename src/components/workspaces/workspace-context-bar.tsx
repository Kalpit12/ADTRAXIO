"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkspaceRole } from "@/components/workspaces/workspace-role";
import { WorkspaceTypeLabel } from "@/components/workspaces/workspace-type-label";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/clients", "/settings", "/billing"];

export function WorkspaceContextBar() {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);

  useEffect(() => {
    fetch("/api/workspaces/context")
      .then((r) => r.json())
      .then((payload: { workspace?: WorkspaceContext }) => {
        if (payload.workspace) setWorkspace(payload.workspace);
      })
      .catch(() => undefined);
  }, [pathname]);

  if (!workspace) return null;

  const inClient =
    workspace.isAgency && workspace.clientWorkspaceId != null;

  if (!workspace.isAgency) return null;

  if (
    !inClient &&
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return null;
  }

  if (inClient && workspace.clientWorkspace) {
    return (
      <div
        className={cn(
          "mb-6 flex flex-col gap-2 border-b border-border/50 pb-5 sm:flex-row sm:items-center sm:justify-between"
        )}
        aria-label="Current workspace context"
      >
        <div className="min-w-0">
          <WorkspaceTypeLabel type="client" />
          <p className="mt-1 truncate font-heading text-lg tracking-tight text-foreground">
            {workspace.clientWorkspace.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Campaigns, content, and publishing in this view apply to this client.
          </p>
        </div>
        {workspace.clientRole && (
          <div className="shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Your role
            </p>
            <WorkspaceRole role={workspace.clientRole} className="mt-1" />
          </div>
        )}
        <Link
          href="/clients"
          className="text-xs font-medium text-adtraxio-accent hover:underline sm:ml-4"
        >
          Agency home
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mb-6 border-b border-border/50 pb-5"
      aria-label="Current workspace context"
    >
      <WorkspaceTypeLabel type="agency" />
      <p className="mt-1 font-heading text-lg tracking-tight text-foreground">
        Your agency
      </p>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Manage clients and agency-wide settings here. Open a client workspace to
        work in their environment.
      </p>
      <Link
        href="/clients"
        className="mt-2 inline-block text-xs font-medium text-adtraxio-accent hover:underline"
      >
        Client workspaces
      </Link>
    </div>
  );
}
