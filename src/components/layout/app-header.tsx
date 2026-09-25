"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NotificationsBell } from "@/components/collaboration/notifications-bell";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Button } from "@/components/ui/button";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { signOut } from "@/lib/auth/auth-service";

interface AppHeaderProps {
  firstName?: string;
}

export function AppHeader({ firstName }: AppHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-border/80 bg-background/70 px-4 backdrop-blur-xl lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <AdtraxioLogo href="/dashboard" size="xs" />
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center gap-2">
        <NotificationsBell />
        {firstName && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {firstName}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" />
          <span className="sr-only sm:not-sr-only">Log out</span>
        </Button>
      </div>
    </header>
  );
}
