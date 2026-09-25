"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function buildAssistantHref(options?: {
  prompt?: string;
  send?: boolean;
  reportId?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.prompt) params.set("prompt", options.prompt);
  if (options?.send) params.set("send", "1");
  if (options?.reportId) params.set("reportId", options.reportId);
  const query = params.toString();
  return query ? `/assistant?${query}` : "/assistant";
}

interface AskAdtraxioLinkProps {
  prompt?: string;
  send?: boolean;
  reportId?: string;
  label?: string;
  className?: string;
  variant?: "inline" | "button";
}

export function AskAdtraxioLink({
  prompt,
  send = true,
  reportId,
  label = "Ask ADTRAXIO AI",
  className,
  variant = "inline",
}: AskAdtraxioLinkProps) {
  const href = buildAssistantHref({ prompt, send, reportId });

  if (variant === "button") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border/70 bg-adtraxio-surface/30 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-adtraxio-accent/35 hover:bg-adtraxio-surface-elevated/40",
          className
        )}
      >
        <Bot className="size-3.5 text-adtraxio-accent" strokeWidth={1.5} />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-adtraxio-accent",
        className
      )}
    >
      <Bot className="size-3.5" strokeWidth={1.5} />
      {label}
    </Link>
  );
}
