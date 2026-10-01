"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { WorkspaceTypeLabel } from "@/components/workspaces/workspace-type-label";
import type { AccessibleWorkspace, WorkspaceContext } from "@/lib/workspaces/types";
import { invalidateDashboardDataCache } from "@/lib/dashboard/service";
import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export function WorkspaceSwitcher({
  collapsed = false,
  className,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [accessible, setAccessible] = useState<AccessibleWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadContext = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces/context");
      const payload = (await response.json()) as {
        workspace?: WorkspaceContext;
        accessible?: AccessibleWorkspace[];
      };

      if (response.ok && payload.workspace) {
        setWorkspace(payload.workspace);
        setAccessible(payload.accessible ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  async function handleChange(value: string) {
    const clientWorkspaceId = value === "agency" ? null : value;
    setSwitching(true);
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientWorkspaceId }),
      });

      if (response.ok) {
        invalidateDashboardDataCache();
        await loadContext();
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  }

  if (loading || !workspace) {
    return (
      <div
        className={cn("h-8 animate-pulse rounded-md bg-secondary/25", className)}
        aria-hidden
      />
    );
  }

  const inClient =
    workspace.isAgency && workspace.clientWorkspaceId != null;
  const contextLabel = inClient
    ? workspace.clientWorkspace?.name ?? "Client"
    : workspace.isAgency
      ? "Agency home"
      : "Your workspace";

  const clientWorkspaces = accessible.filter((w) => w.type === "client");
  const showAgencySelect =
    workspace.isAgency && accessible.length > 1;

  if (!workspace.isAgency) {
    if (collapsed) {
      return (
        <span
          className={cn(
            "mx-auto flex size-8 items-center justify-center rounded-md border border-border/70 text-[10px] font-medium uppercase text-muted-foreground",
            className
          )}
          title={contextLabel}
        >
          W
        </span>
      );
    }
    return (
      <div className={cn("min-w-0", className)}>
        <WorkspaceTypeLabel type="standard" />
        <p className="truncate text-xs font-medium text-foreground" title={contextLabel}>
          {contextLabel}
        </p>
      </div>
    );
  }

  if (!showAgencySelect) {
    if (collapsed) {
      return (
        <span
          className={cn(
            "mx-auto flex size-8 items-center justify-center rounded-md border border-border/70 text-[10px] font-medium uppercase text-muted-foreground",
            className
          )}
          title={contextLabel}
        >
          {inClient ? contextLabel.charAt(0) : "A"}
        </span>
      );
    }
    return (
      <div className={cn("min-w-0 space-y-0.5", className)}>
        <WorkspaceTypeLabel type={inClient ? "client" : "agency"} />
        <p
          className="truncate text-xs font-medium text-foreground"
          title={contextLabel}
        >
          {contextLabel}
        </p>
        {clientWorkspaces.length === 0 && !inClient && (
          <p className="text-[10px] text-muted-foreground">No client workspaces yet</p>
        )}
      </div>
    );
  }

  const currentValue = workspace.clientWorkspaceId ?? "agency";

  return (
    <div className={cn("relative min-w-0 space-y-1", className)}>
      {!collapsed && (
        <WorkspaceTypeLabel type={inClient ? "client" : "agency"} />
      )}
      <label className="sr-only" htmlFor="workspace-switcher">
        Switch workspace
      </label>
      <div className="relative">
        <select
          id="workspace-switcher"
          value={currentValue}
          onChange={(e) => void handleChange(e.target.value)}
          disabled={switching}
          className={cn(
            "h-8 w-full appearance-none truncate rounded-md border border-border/70 bg-adtraxio-surface/25 py-0 pl-2.5 pr-7 text-xs font-medium text-foreground outline-none focus:border-adtraxio-accent/45",
            collapsed && "max-w-[44px] px-1 text-center text-[10px]"
          )}
          aria-busy={switching}
        >
          <optgroup label="Agency">
            <option value="agency">Agency home</option>
          </optgroup>
          {clientWorkspaces.length > 0 && (
            <optgroup label="Client workspaces">
              {clientWorkspaces.map((item) => (
                <option key={item.id!} value={item.id!}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {!collapsed && (
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
