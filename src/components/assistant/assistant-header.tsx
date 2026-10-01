"use client";

import Link from "next/link";
import {
  Brain,
  ClipboardList,
  FlaskConical,
  Menu,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssistantHeaderProps {
  workspaceLabel: string | null;
  onNewConversation: () => void;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
}

export function AssistantHeader({
  workspaceLabel,
  onNewConversation,
  onToggleSidebar,
  showSidebarToggle,
}: AssistantHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 lg:px-5"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showSidebarToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleSidebar}
            className="shrink-0 lg:hidden"
            aria-label="Open conversations"
          >
            <Menu className="size-4" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">
            Growth Copilot
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            AI growth console
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        {workspaceLabel && (
          <p
            className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:block"
            title={workspaceLabel}
          >
            {workspaceLabel}
          </p>
        )}
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/assistant/briefs">
            <ClipboardList className="size-3.5" />
            Briefs
          </Link>
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/assistant/experiments">
            <FlaskConical className="size-3.5" />
            Experiments
          </Link>
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="hidden lg:inline-flex"
        >
          <Link href="/assistant/optimization">
            <ShieldCheck className="size-3.5" />
            Optimization
          </Link>
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex"
        >
          <Link href="/assistant/brand">
            <Brain className="size-3.5" />
            Brand
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onNewConversation}
          aria-label="New conversation"
        >
          <MessageSquarePlus className="size-4" />
        </Button>
      </div>
    </header>
  );
}
