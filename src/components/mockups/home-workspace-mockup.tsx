"use client";

import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  Megaphone,
  PenLine,
  Send,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Create", icon: PenLine, active: false },
  { label: "Campaigns", icon: Megaphone, active: false },
  { label: "Publishing", icon: Send, active: false },
  { label: "Analytics", icon: BarChart3, active: false },
] as const;

function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "amber";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium",
        tone === "neutral" && "border-border/70 text-muted-foreground",
        tone === "accent" && "border-adtraxio-accent/30 text-adtraxio-accent",
        tone === "amber" && "border-amber-500/30 text-amber-200/90",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Illustrative workspace console for marketing — not live data. */
export function HomeWorkspaceMockup() {
  return (
    <div
      className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-border bg-adtraxio-surface"
      role="img"
      aria-label="Illustration of ADTRAXIO workspace showing content, campaigns, approvals, and connected social accounts"
    >
      <div className="flex border-b border-border">
        <div className="hidden w-[38%] min-w-0 border-r border-border bg-background/40 sm:block">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[10px] font-medium tracking-wide text-foreground">
              ADTRAXIO
            </p>
          </div>
          <nav className="p-2" aria-hidden>
            <ul className="space-y-0.5">
              {NAV.map((item) => (
                <li key={item.label}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1.5 text-[11px]",
                      item.active
                        ? "border-l-2 border-adtraxio-accent bg-adtraxio-accent/5 pl-[calc(0.5rem-2px)] font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="size-3 shrink-0 opacity-80" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:px-4">
            <p className="text-[11px] font-medium text-foreground">Overview</p>
            <div className="flex gap-1.5 sm:hidden" aria-hidden>
              <span className="size-1.5 rounded-full bg-border" />
              <span className="size-1.5 rounded-full bg-border" />
              <span className="size-1.5 rounded-full bg-border" />
            </div>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Your workspace
            </p>
          </div>

          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-2.5 sm:p-4">
            <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Content
              </p>
              <ul className="mt-2 space-y-1 text-[11px] leading-snug text-foreground/90">
                <li className="flex items-center justify-between gap-2">
                  <span>12 drafts</span>
                  <StatusPill>In progress</StatusPill>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>3 scheduled</span>
                  <StatusPill tone="accent">Queued</StatusPill>
                </li>
              </ul>
            </div>

            <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Campaigns
              </p>
              <p className="mt-2 text-[11px] font-medium text-foreground">
                Lead generation
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                2 active campaigns
              </p>
            </div>

            <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Approvals
              </p>
              <div className="mt-2 flex items-center gap-2">
                <ClipboardCheck
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-[11px] text-foreground/90">
                  3 waiting for review
                </p>
              </div>
              <StatusPill tone="amber" className="mt-2">
                Needs attention
              </StatusPill>
            </div>

            <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Social accounts
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-foreground/90">
                <li className="flex items-center gap-2">
                  <Share2 className="size-3 shrink-0 text-muted-foreground" />
                  Instagram · connected
                </li>
                <li className="flex items-center gap-2">
                  <Share2 className="size-3 shrink-0 text-muted-foreground" />
                  Facebook · connected
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
