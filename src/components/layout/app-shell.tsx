"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getDashboardData } from "@/lib/dashboard/service";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAssistant =
    pathname === "/assistant" || pathname.startsWith("/assistant/");
  const [firstName, setFirstName] = useState<string>();
  const [profileName, setProfileName] = useState<string>();

  useEffect(() => {
    getDashboardData().then((result) => {
      if (result.data?.user.firstName) {
        setFirstName(result.data.user.firstName);
      }
      if (result.data?.user.profileName) {
        setProfileName(result.data.user.profileName);
      }
    });
  }, []);

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
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
              {children}
            </div>
          )}
        </main>
      </div>

      {!isAssistant && <MobileNav />}
    </div>
  );
}
