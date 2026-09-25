"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import {
  AI_NAV,
  FOOTER_NAV,
  MAIN_NAV,
  SECONDARY_NAV,
  type NavItem,
} from "@/lib/navigation/app-nav";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors duration-150",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-adtraxio-accent"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      />
      {item.label}
    </Link>
  );
}

function NavSection({
  items,
  label,
}: {
  items: NavItem[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-0.5">
      {label && (
        <p className="mb-2 px-3 text-xs text-muted-foreground/70">{label}</p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          }
        />
      ))}
    </div>
  );
}

interface AppSidebarProps {
  firstName?: string;
  profileName?: string;
}

export function AppSidebar({ firstName, profileName }: AppSidebarProps) {
  const pathname = usePathname();
  const displayName = profileName ?? firstName ?? "Workspace";
  const initial = displayName.charAt(0).toUpperCase();
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);

  useEffect(() => {
    fetch("/api/workspaces/context")
      .then((r) => r.json())
      .then((payload: { workspace?: WorkspaceContext }) => {
        if (payload.workspace) setWorkspace(payload.workspace);
      })
      .catch(() => undefined);
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

  return (
    <aside className="hidden h-full min-h-screen w-[248px] shrink-0 flex-col border-r border-border/80 bg-sidebar lg:flex lg:min-h-0 lg:self-stretch">
      <div className="flex h-[60px] flex-col justify-center gap-1.5 px-5">
        <AdtraxioLogo href="/dashboard" size="xs" />
        <WorkspaceSwitcher />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <NavSection
          items={mainNav}
          label={inClientWorkspace ? "Client workspace" : "Workspace"}
        />
        {secondaryNav.length > 0 && (
          <NavSection items={secondaryNav} label="Manage" />
        )}
        {inClientWorkspace && <NavSection items={AI_NAV} />}
        {!workspace?.isAgency && <NavSection items={AI_NAV} />}
      </nav>

      <div className="border-t border-border/80 p-3">
        <NavSection items={FOOTER_NAV} />
        <div className="mt-3 flex items-center gap-3 px-3 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-secondary/40 text-sm font-medium text-foreground">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Growth workspace
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
