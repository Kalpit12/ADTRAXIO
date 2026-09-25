"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AccessibleWorkspace, WorkspaceContext } from "@/lib/workspaces/types";

export function WorkspaceSwitcher() {
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
      // Non-agency — hide switcher
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
        await loadContext();
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  }

  if (loading || !workspace?.isAgency || accessible.length <= 1) {
    return null;
  }

  const currentValue = workspace.clientWorkspaceId ?? "agency";

  return (
    <select
      value={currentValue}
      onChange={(e) => void handleChange(e.target.value)}
      disabled={switching}
      aria-label="Switch workspace"
      className="h-8 max-w-[180px] truncate rounded-md border border-border/70 bg-secondary/20 px-2 text-xs text-foreground outline-none focus:border-adtraxio-accent/50 sm:max-w-[220px]"
    >
      {accessible.map((item) => (
        <option key={item.id ?? "agency"} value={item.id ?? "agency"}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
