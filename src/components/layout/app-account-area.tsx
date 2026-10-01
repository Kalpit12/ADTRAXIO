"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/auth-service";
import { cn } from "@/lib/utils";

interface AppAccountAreaProps {
  displayName: string;
  subtitle?: string;
  collapsed?: boolean;
}

export function AppAccountArea({
  displayName,
  subtitle = "Growth workspace",
  collapsed = false,
}: AppAccountAreaProps) {
  const router = useRouter();
  const initial = displayName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span
          className="flex size-9 items-center justify-center rounded-md border border-border/70 bg-adtraxio-surface/30 text-sm font-medium text-foreground"
          title={displayName}
        >
          {initial}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void handleSignOut()}
          aria-label="Sign out"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/70 bg-adtraxio-surface/20 p-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-sm font-medium text-foreground"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          asChild
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link href="/settings" aria-label="Settings">
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void handleSignOut()}
        className={cn(
          "mt-2 h-8 w-full justify-start gap-2 px-2 text-xs text-muted-foreground hover:text-foreground"
        )}
      >
        <LogOut className="size-3.5" />
        Sign out
      </Button>
    </div>
  );
}
