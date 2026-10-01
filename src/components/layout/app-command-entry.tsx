"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppCommandEntryProps {
  collapsed?: boolean;
  className?: string;
}

/** Entry to Growth Copilot — no backend search in this phase. */
export function AppCommandEntry({
  collapsed = false,
  className,
}: AppCommandEntryProps) {
  return (
    <Link
      href="/assistant"
      className={cn(
        "flex items-center gap-2.5 rounded-md border border-border/80 bg-adtraxio-surface/25 px-3 py-2 text-[13px] text-muted-foreground transition-colors",
        "hover:border-adtraxio-accent/30 hover:bg-adtraxio-surface/40 hover:text-foreground",
        collapsed && "justify-center px-2",
        className
      )}
      title="Growth Copilot"
    >
      <Bot className="size-4 shrink-0 text-adtraxio-accent" strokeWidth={1.5} />
      {!collapsed && (
        <span className="truncate">Open Growth Copilot</span>
      )}
    </Link>
  );
}
