"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AI_NAV,
  FOOTER_NAV,
  MAIN_NAV,
  SECONDARY_NAV,
  type NavItem,
} from "@/lib/navigation/app-nav";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export type ShellNavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const OVERVIEW_HREFS = new Set(["/dashboard"]);
const GROW_HREFS = new Set([
  "/create",
  "/campaigns",
  "/calendar",
  "/analytics",
  "/intelligence",
]);

function pickMain(items: NavItem[]) {
  return items.filter((i) => OVERVIEW_HREFS.has(i.href));
}

function pickGrow(items: NavItem[]) {
  return items.filter((i) => GROW_HREFS.has(i.href));
}

function buildSections(
  mainNav: NavItem[],
  secondaryNav: NavItem[],
  aiNav: NavItem[],
  inClientWorkspace: boolean
): ShellNavSection[] {
  const sections: ShellNavSection[] = [];

  const overview = pickMain(mainNav);
  if (overview.length > 0) {
    sections.push({ id: "overview", label: "Overview", items: overview });
  }

  const grow = [...pickGrow(mainNav), ...aiNav];
  if (grow.length > 0) {
    sections.push({
      id: "grow",
      label: "Grow",
      items: grow,
    });
  }

  if (secondaryNav.length > 0) {
    sections.push({
      id: "workspace",
      label: inClientWorkspace ? "Client workspace" : "Workspace",
      items: secondaryNav,
    });
  }

  if (FOOTER_NAV.length > 0) {
    sections.push({ id: "account", label: "Account", items: FOOTER_NAV });
  }

  return sections;
}

export function useShellNavigation() {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workspaces/context")
      .then((r) => r.json())
      .then((payload: { workspace?: WorkspaceContext }) => {
        if (payload.workspace) setWorkspace(payload.workspace);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [pathname]);

  const inClientWorkspace =
    workspace?.isAgency && workspace.clientWorkspaceId != null;

  const mainNav = inClientWorkspace
    ? MAIN_NAV
    : workspace?.isAgency
      ? MAIN_NAV.filter((item) => item.href === "/dashboard")
      : MAIN_NAV;

  const secondaryNav = SECONDARY_NAV.filter((item) => {
    if (item.href === "/clients") {
      return workspace?.isAgency && !inClientWorkspace;
    }
    if (inClientWorkspace) return true;
    if (workspace?.isAgency) {
      return item.href === "/clients";
    }
    return item.href !== "/clients";
  });

  const aiNav =
    inClientWorkspace || !workspace?.isAgency ? AI_NAV : [];

  const sections = buildSections(
    mainNav,
    secondaryNav,
    aiNav,
    Boolean(inClientWorkspace)
  );

  const workspaceLabel = inClientWorkspace
    ? workspace?.clientWorkspace?.name ?? "Client workspace"
    : workspace?.isAgency
      ? "Agency workspace"
      : "Your workspace";

  return {
    sections,
    workspace,
    workspaceLabel,
    loading,
    inClientWorkspace,
  };
}
