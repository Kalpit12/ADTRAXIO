"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { AppAccountArea } from "@/components/layout/app-account-area";
import { AppCommandEntry } from "@/components/layout/app-command-entry";
import { ShellNavSection } from "@/components/layout/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { NotificationsBell } from "@/components/collaboration/notifications-bell";
import { Button } from "@/components/ui/button";
import { useShellNavigation } from "@/lib/navigation/use-shell-navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "adtraxio_sidebar_collapsed";

interface AppSidebarProps {
  firstName?: string;
  profileName?: string;
}

export function AppSidebar({ firstName, profileName }: AppSidebarProps) {
  const displayName = profileName ?? firstName ?? "Workspace";
  const { sections, workspaceLabel, inClientWorkspace } = useShellNavigation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const accountSections = sections.filter((s) => s.id === "account");
  const navSections = sections.filter((s) => s.id !== "account");

  return (
    <aside
      className={cn(
        "hidden h-full min-h-screen shrink-0 flex-col border-r border-border/80 bg-sidebar transition-[width] duration-200 ease-out lg:flex lg:min-h-0 lg:self-stretch",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col gap-3 border-b border-border/60 px-3 py-4",
          collapsed ? "items-center" : "px-4"
        )}
      >
        <div
          className={cn(
            "flex w-full items-center gap-2",
            collapsed ? "flex-col" : "justify-between"
          )}
        >
          <AdtraxioLogo
            href="/dashboard"
            size={collapsed ? "xs" : "sm"}
            className={cn(collapsed && "max-w-[52px]")}
          />
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            {!collapsed && <NotificationsBell />}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={toggleCollapsed}
              className="text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <WorkspaceSwitcher collapsed={collapsed} className="w-full" />

        <AppCommandEntry collapsed={collapsed} className="w-full" />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 py-4">
        {navSections.map((section) => (
          <ShellNavSection
            key={section.id}
            label={section.label}
            items={section.items}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border/60 p-3">
        {!collapsed &&
          accountSections.map((section) => (
            <ShellNavSection
              key={section.id}
              label={section.label}
              items={section.items}
            />
          ))}
        <AppAccountArea
          displayName={displayName}
          subtitle={
            inClientWorkspace ? workspaceLabel : `${workspaceLabel} · Account`
          }
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
