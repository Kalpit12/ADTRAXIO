"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WorkspaceContextBar } from "@/components/workspaces/workspace-context-bar";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAssistant =
    pathname === "/assistant" || pathname.startsWith("/assistant/");
  const { data } = useDashboardData();

  const firstName = data?.user.firstName;
  const profileName = data?.user.profileName ?? undefined;

  return (
    <div className="flex min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <AppSidebar firstName={firstName} profileName={profileName} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader firstName={firstName} />

        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-x-hidden",
            isAssistant
              ? "overflow-hidden pb-0 lg:pb-0"
              : "overflow-y-auto pb-24 lg:pb-8"
          )}
        >
          {isAssistant ? (
            <div className="flex h-[calc(100dvh-60px)] min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-full">
              {children}
            </div>
          ) : (
            <div className="app-page-container mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
              <WorkspaceContextBar />
              {children}
            </div>
          )}
        </main>
      </div>

      {!isAssistant && <MobileNav />}
    </div>
  );
}
